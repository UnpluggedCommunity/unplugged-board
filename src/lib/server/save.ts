import { fail } from '@sveltejs/kit';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ListingType } from '$lib/constants';
import { parseValues } from '$lib/fields';
import { zoneForSuburb } from './listings';

/** Create (id = null) or update a listing from the staff form. */
export async function saveListing(
	supabase: SupabaseClient,
	userId: string,
	type: ListingType,
	form: FormData,
	id: number | null
) {
	// Text fields only (photos are Files and are handled below)
	const raw = Object.fromEntries([...form].filter(([, v]) => typeof v === 'string')) as Record<string, string>;
	const { listing, priv, errors } = parseValues(type, raw);
	if (errors.length) return { error: fail(400, { message: errors.join('. '), values: raw }) };

	if (!listing.zone) listing.zone = await zoneForSuburb(supabase, listing.suburb as string | null);

	const status = raw.intent === 'draft' ? 'draft' : 'published';
	let listingId = id;

	if (id == null) {
		const { data, error } = await supabase
			.from('listings')
			.insert({ ...listing, status, created_by: userId })
			.select('id')
			.single();
		if (error) {
			console.error('insert listing', error);
			return { error: fail(500, { message: 'Could not save: ' + error.message, values: raw }) };
		}
		listingId = data.id;
	} else {
		const { error } = await supabase
			.from('listings')
			.update({ ...listing, ...(raw.intent ? { status } : {}) })
			.eq('id', id);
		if (error) {
			console.error('update listing', error);
			return { error: fail(500, { message: 'Could not save: ' + error.message, values: raw }) };
		}
	}

	const { error: privError } = await supabase
		.from('listing_private')
		.upsert({ listing_id: listingId, ...priv });
	if (privError) {
		console.error('save private', privError);
		return { error: fail(500, { message: 'Saved, but contacts failed: ' + privError.message, values: raw }) };
	}
	const uploaded = await uploadPhotos(supabase, listingId as number, form.getAll('photos'));
	if (uploaded.error) return { error: fail(500, { message: uploaded.error, values: raw }) };
	return { id: listingId as number };
}

const MAX_PHOTOS = 6;

/** Store new listing photos (already resized in the browser) and append their public URLs. */
async function uploadPhotos(supabase: SupabaseClient, listingId: number, entries: FormDataEntryValue[]) {
	const files = entries
		.filter((f): f is File => f instanceof File && f.size > 0 && f.size <= 1024 * 1024 && /^image\/(webp|jpeg|png)$/.test(f.type))
		.slice(0, MAX_PHOTOS);
	if (!files.length) return {};

	const urls: string[] = [];
	for (const file of files) {
		const ext = file.type === 'image/webp' ? 'webp' : file.type === 'image/png' ? 'png' : 'jpg';
		const path = `${listingId}/${crypto.randomUUID()}.${ext}`;
		const { error } = await supabase.storage
			.from('listing-photos')
			.upload(path, file, { contentType: file.type, cacheControl: '31536000' });
		if (error) {
			console.error('photo upload', error);
			return { error: 'Saved, but a photo failed to upload: ' + error.message };
		}
		urls.push(supabase.storage.from('listing-photos').getPublicUrl(path).data.publicUrl);
	}
	const { data } = await supabase.from('listings').select('photos').eq('id', listingId).single();
	const photos = [...((data?.photos as string[]) ?? []), ...urls].slice(0, MAX_PHOTOS);
	const { error } = await supabase.from('listings').update({ photos }).eq('id', listingId);
	return error ? { error: 'Saved, but photos could not be attached: ' + error.message } : {};
}

/** Delete all photos of a listing (files + URLs). */
export async function removePhotos(supabase: SupabaseClient, listingId: number) {
	const { data } = await supabase.storage.from('listing-photos').list(String(listingId));
	if (data?.length) await supabase.storage.from('listing-photos').remove(data.map((f) => `${listingId}/${f.name}`));
	await supabase.from('listings').update({ photos: [] }).eq('id', listingId);
}
