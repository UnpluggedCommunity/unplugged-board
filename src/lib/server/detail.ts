import { fail, type RequestEvent } from '@sveltejs/kit';
import type { ListingType } from '$lib/constants';
import { loadListing } from './listings';

export async function loadDetail(event: RequestEvent, type: ListingType) {
	const me = await event.locals.getMe();
	const canSeeContacts = Boolean(me?.isMember);
	const { listing, contact } = await loadListing(
		event.locals.supabase,
		type,
		event.params.id ?? '',
		canSeeContacts
	);
	let saved = false;
	if (me) {
		const { data } = await event.locals.supabase
			.from('saved_listings')
			.select('listing_id')
			.eq('user_id', me.id)
			.eq('listing_id', listing.id)
			.maybeSingle();
		saved = Boolean(data);
	}
	return { listing, contact, canSeeContacts, saved, origin: event.url.origin };
}

export const detailActions = {
	// "Already taken" / "Looks suspicious" — logged-in users, once per listing and kind.
	report: async ({ request, locals, params }: RequestEvent) => {
		const me = await locals.getMe();
		if (!me) return fail(401, { reportError: 'Log in to report.' });
		const form = await request.formData();
		const kind = form.get('kind') === 'suspicious' ? 'suspicious' : 'taken';
		const note = String(form.get('note') ?? '').trim().slice(0, 500) || null;
		const { error } = await locals.supabase
			.from('listing_reports')
			.insert({ listing_id: Number(params.id), user_id: me.id, kind, note });
		if (error && error.code !== '23505') {
			console.error('report', error);
			return fail(500, { reportError: 'Something went wrong. Please try again.' });
		}
		return { reported: kind };
	},
	// "Request removal" — open to everyone, including visitors.
	removal: async ({ request, locals, params }: RequestEvent) => {
		const form = await request.formData();
		if (form.get('website')) return { removalSent: true }; // honeypot: bots fill every field
		const reason = String(form.get('reason') ?? '').trim();
		const email = String(form.get('email') ?? '').trim() || null;
		if (reason.length < 5) return fail(400, { removalError: 'Please tell us briefly why.' });
		const { error } = await locals.supabase
			.from('removal_requests')
			.insert({ listing_id: Number(params.id), reason: reason.slice(0, 2000), email });
		if (error) {
			console.error('removal', error);
			return fail(500, { removalError: 'Something went wrong. Please try again.' });
		}
		return { removalSent: true };
	}
};
