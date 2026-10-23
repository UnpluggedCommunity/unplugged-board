import { redirect } from '@sveltejs/kit';
import type { ListingType } from '$lib/constants';
import { toFormValues } from '$lib/fields';
import { saveListing } from '$lib/server/save';
import type { Actions, PageServerLoad } from './$types';

const typeOf = (url: URL): ListingType => (url.searchParams.get('type') === 'room' ? 'room' : 'job');

export const load: PageServerLoad = async ({ url }) => {
	const type = typeOf(url);
	return { type, initial: toFormValues(type, {}) };
};

export const actions: Actions = {
	save: async ({ locals, request, url }) => {
		const me = (await locals.getMe())!;
		const type = typeOf(url);
		const result = await saveListing(locals.supabase, me.id, type, await request.formData(), null);
		if (result.error) return result.error;
		redirect(303, `${type === 'job' ? '/j' : '/r'}/${result.id}`);
	}
};
