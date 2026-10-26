import { redirect } from '@sveltejs/kit';
import { loadListing } from './listings';

type Channel = 'email' | 'phone' | 'link' | 'none';

/** Logged-in member + the job they're applying to (redirects otherwise). */
export async function context(event: { locals: App.Locals; params: { id: string }; url: URL }) {
	const { locals, params, url } = event;
	const me = await locals.getMe();
	if (!me) redirect(303, `/login?next=${encodeURIComponent(url.pathname)}`);
	if (!me.isMember) redirect(303, `/join?next=${encodeURIComponent(url.pathname)}`);
	const { listing, contact } = await loadListing(locals.supabase, 'job', params.id, true);
	const channel: Channel = contact?.contact_email
		? 'email'
		: contact?.contact_phone
			? 'phone'
			: contact?.apply_url
				? 'link'
				: 'none';
	return { me, listing, contact, channel };
}

