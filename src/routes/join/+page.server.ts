import { fail, redirect } from '@sveltejs/kit';
import { safeNext } from '$lib/server/safe-next';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const me = await locals.getMe();
	const next = safeNext(url.searchParams.get('next'));
	if (!me) redirect(303, `/login?next=${encodeURIComponent('/join?next=' + next)}`);
	if (me.isMember) redirect(303, next);
	return { next };
};

export const actions: Actions = {
	default: async ({ locals, request }) => {
		const form = await request.formData();
		const code = String(form.get('code') ?? '');
		const next = safeNext(String(form.get('next') ?? ''));
		if (!code.trim()) return fail(400, { message: 'Enter the code.' });
		const { data, error } = await locals.supabase.rpc('redeem_access_code', { code });
		if (error) {
			const tooMany = error.message.includes('too_many_attempts');
			return fail(tooMany ? 429 : 500, {
				message: tooMany
					? 'Too many wrong attempts. Try again in an hour.'
					: 'Something went wrong. Please try again.'
			});
		}
		if (!data) return fail(400, { message: "That code isn't right. Check the latest one in the WhatsApp group." });
		redirect(303, next);
	}
};
