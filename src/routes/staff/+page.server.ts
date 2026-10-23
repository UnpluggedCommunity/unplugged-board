import { fail } from '@sveltejs/kit';
import type { Listing } from '$lib/format';
import type { Actions, PageServerLoad } from './$types';

const VIEWS = {
	live: 'Live',
	expired: 'Expired',
	draft: 'Drafts',
	archived: 'Archived'
} as const;

export const load: PageServerLoad = async ({ locals, url }) => {
	const view = (url.searchParams.get('view') ?? 'live') as keyof typeof VIEWS;
	const now = new Date().toISOString();
	let q = locals.supabase.from('listings').select('*');
	if (view === 'live') q = q.eq('status', 'published').gt('expires_at', now);
	else if (view === 'expired') q = q.eq('status', 'published').lte('expires_at', now);
	else q = q.eq('status', view);
	const [{ data: listings }, { data: removals }] = await Promise.all([
		q.order('created_at', { ascending: false }).limit(100),
		locals.supabase
			.from('removal_requests')
			.select('id, listing_id, email, reason, created_at, listings(type, title)')
			.eq('handled', false)
			.order('created_at')
	]);
	return {
		view,
		views: VIEWS,
		listings: (listings ?? []) as Listing[],
		removals: removals ?? [],
		origin: url.origin
	};
};

async function setStatus(locals: App.Locals, form: FormData, status: string) {
	const id = Number(form.get('id'));
	const { error } = await locals.supabase.from('listings').update({ status }).eq('id', id);
	if (error) return fail(500, { message: error.message });
}

export const actions: Actions = {
	archive: async ({ locals, request }) => setStatus(locals, await request.formData(), 'archived'),
	publish: async ({ locals, request }) => setStatus(locals, await request.formData(), 'published'),
	renew: async ({ locals, request }) => {
		const id = Number((await request.formData()).get('id'));
		const { error } = await locals.supabase.rpc('renew_listing', { listing: id });
		if (error) return fail(500, { message: error.message });
	},
	delete: async ({ locals, request }) => {
		const id = Number((await request.formData()).get('id'));
		const { error } = await locals.supabase.from('listings').delete().eq('id', id);
		if (error) return fail(500, { message: error.message });
	},
	handled: async ({ locals, request }) => {
		const id = Number((await request.formData()).get('id'));
		await locals.supabase.from('removal_requests').update({ handled: true }).eq('id', id);
	}
};
