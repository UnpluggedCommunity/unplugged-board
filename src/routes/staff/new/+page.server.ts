import { redirect } from '@sveltejs/kit';
import type { ListingType } from '$lib/constants';
import { toFormValues } from '$lib/fields';
import { aiConfigured } from '$lib/server/ai';
import { saveListing } from '$lib/server/save';
import type { Actions, PageServerLoad } from './$types';

const asType = (v: unknown): ListingType | null => (v === 'room' ? 'room' : v === 'job' ? 'job' : null);

export const load: PageServerLoad = async ({ url }) => {
	const type = asType(url.searchParams.get('type')) ?? 'job';
	return { type, initial: toFormValues(type, {}), aiReady: aiConfigured() };
};

export const actions: Actions = {
	save: async ({ locals, request }) => {
		const me = (await locals.getMe())!;
		const form = await request.formData();
		const type = asType(form.get('listing_type')) ?? 'job';
		const result = await saveListing(locals.supabase, me.id, type, form, null);
		if (result.error) return result.error;
		redirect(303, `${type === 'job' ? '/j' : '/r'}/${result.id}`);
	}
};
