/** Browser helpers for staff publishing (batch Quick Add and the single form). */
import { deserialize } from '$app/forms';
import type { ListingType } from './constants';
import { parseValues, type FormValues } from './fields';
import type { Listing } from './format';
import { drawShareCard } from './og-image';

/** Enough of a Listing to format prices/places from the form values. */
export function listingFromValues(type: ListingType, values: FormValues, id: number): Listing {
	const { listing } = parseValues(type, values);
	return {
		id,
		status: 'published',
		photos: [],
		og_image: null,
		req_tickets: [],
		rent_from_month: false,
		whv_417: 'unknown',
		...listing
	} as unknown as Listing;
}

/** Draw the WhatsApp share card and store it. Failures are silent: the generic card is used. */
export async function uploadShareCard(listing: Listing) {
	try {
		const blob = await drawShareCard(listing);
		await fetch(`/staff/og/${listing.id}`, { method: 'POST', body: blob, headers: { 'content-type': 'image/jpeg' } });
	} catch (e) {
		console.warn('share card', e);
	}
}

/** Create a listing through the staff "save" action. */
export async function createListing(
	type: ListingType,
	values: FormValues,
	photos: File[],
	intent: 'publish' | 'draft'
): Promise<{ ok: true; id: number; path: string } | { ok: false; message: string }> {
	const fd = new FormData();
	for (const [k, v] of Object.entries(values)) fd.set(k, v);
	fd.set('listing_type', type);
	fd.set('intent', intent);
	photos.forEach((p) => fd.append('photos', p));
	const res = await fetch('/staff/new?/save', {
		method: 'POST',
		body: fd,
		headers: { accept: 'application/json', 'x-sveltekit-action': 'true' }
	});
	const result = deserialize(await res.text());
	if (result.type === 'redirect') {
		const id = Number(result.location.split('/').pop());
		if (intent === 'publish') await uploadShareCard(listingFromValues(type, values, id));
		return { ok: true, id, path: result.location };
	}
	if (result.type === 'failure') return { ok: false, message: String(result.data?.message ?? 'Could not save') };
	return { ok: false, message: 'Could not save' };
}
