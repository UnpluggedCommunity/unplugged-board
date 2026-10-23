import { error, redirect } from '@sveltejs/kit';
import { toFormValues } from '$lib/fields';
import type { ListingType } from '$lib/constants';
import { saveListing } from '$lib/server/save';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const id = Number(params.id);
	const [{ data: listing }, { data: priv }] = await Promise.all([
		locals.supabase.from('listings').select('*').eq('id', id).maybeSingle(),
		locals.supabase.from('listing_private').select('*').eq('listing_id', id).maybeSingle()
	]);
	if (!listing) error(404, 'Listing not found');
	const type = listing.type as ListingType;
	return { id, type, initial: toFormValues(type, { ...listing, ...(priv ?? {}) }) };
};

export const actions: Actions = {
	save: async ({ locals, request, params }) => {
		const me = (await locals.getMe())!;
		const id = Number(params.id);
		const { data } = await locals.supabase.from('listings').select('type').eq('id', id).single();
		const type = data!.type as ListingType;
		const result = await saveListing(locals.supabase, me.id, type, await request.formData(), id);
		if (result.error) return result.error;
		redirect(303, `${type === 'job' ? '/j' : '/r'}/${id}`);
	}
};
