import { fail, redirect } from '@sveltejs/kit';
import { emptyProfile } from '$lib/profile';
import { loadJobProfile, parseProfileForm } from '$lib/server/profile';
import { safeNext } from '$lib/server/safe-next';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const me = (await locals.getMe())!;
	const saved = await loadJobProfile(locals.supabase, me.id);
	// First time: start from what Google already told us.
	const profile = saved ?? { ...emptyProfile(), full_name: me.name, email: me.email };
	return { profile, isNew: !saved, next: safeNext(url.searchParams.get('next'), '/me') };
};

export const actions: Actions = {
	default: async ({ locals, request }) => {
		const me = (await locals.getMe())!;
		const form = await request.formData();
		const profile = parseProfileForm(form);
		if (!profile.full_name) return fail(400, { message: 'Add your full name (step 1).' });
		const { error } = await locals.supabase
			.from('job_profiles')
			.upsert({ user_id: me.id, ...profile, updated_at: new Date().toISOString() });
		if (error) {
			console.error('save profile', error);
			return fail(500, { message: 'Could not save your profile. Please try again.' });
		}
		redirect(303, safeNext(String(form.get('next') ?? ''), '/me'));
	}
};
