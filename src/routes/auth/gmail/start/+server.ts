import { error, redirect } from '@sveltejs/kit';
import { authUrl, gmailConfigured } from '$lib/server/gmail';
import { safeNext } from '$lib/server/safe-next';
import type { RequestHandler } from './$types';

/** Ask Google for permission to send from the member's Gmail, then come back to `next`. */
export const GET: RequestHandler = async ({ locals, url, cookies }) => {
	const me = await locals.getMe();
	if (!me) redirect(303, `/login?next=${encodeURIComponent(url.pathname + url.search)}`);
	if (!gmailConfigured()) error(503, 'Sending from Gmail is not switched on yet.');
	redirect(303, authUrl(url, cookies, safeNext(url.searchParams.get('next'), '/me'), me.email));
};
