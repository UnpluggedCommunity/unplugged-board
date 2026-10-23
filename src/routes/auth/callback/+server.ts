import { redirect } from '@sveltejs/kit';
import { safeNext } from '$lib/server/safe-next';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	const code = url.searchParams.get('code');
	const next = safeNext(url.searchParams.get('next'));
	if (code) {
		const { error } = await locals.supabase.auth.exchangeCodeForSession(code);
		if (!error) {
			const me = await locals.getMe();
			redirect(303, me && !me.isMember ? `/join?next=${encodeURIComponent(next)}` : next);
		}
		console.error('auth callback', error);
	}
	redirect(303, '/login?error=1');
};
