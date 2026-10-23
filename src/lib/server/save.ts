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
	const raw = Object.fromEntries(form) as Record<string, string>;
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
	return { id: listingId as number };
}
