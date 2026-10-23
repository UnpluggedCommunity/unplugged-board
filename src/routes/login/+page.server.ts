import { fail, redirect } from '@sveltejs/kit';
import { safeNext } from '$lib/server/safe-next';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const me = await locals.getMe();
	if (me) redirect(303, safeNext(url.searchParams.get('next')));
	return { next: safeNext(url.searchParams.get('next')), error: url.searchParams.get('error') };
};

export const actions: Actions = {
	google: async ({ locals, url, request }) => {
		const next = safeNext(String((await request.formData()).get('next') ?? ''));
		const { data, error } = await locals.supabase.auth.signInWithOAuth({
			provider: 'google',
			options: { redirectTo: `${url.origin}/auth/callback?next=${encodeURIComponent(next)}` }
		});
		if (error || !data.url) {
			console.error('oauth', error);
			return fail(500, { message: 'Google login is not available right now.' });
		}
		redirect(303, data.url);
	}
};
