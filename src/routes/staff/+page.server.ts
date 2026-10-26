import { fail } from '@sveltejs/kit';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Listing } from '$lib/format';
import type { Actions, PageServerLoad } from './$types';

const VIEWS = {
	live: 'Live',
	draft: 'Drafts',
	hidden: 'Hidden',
	expired: 'Expired',
	archived: 'Archived'
} as const;

/**
 * Housekeeping, run lazily when staff open the dashboard (no cron needed):
 * archive expired listings, delete photos of listings archived 30+ days ago.
 */
async function cleanUp(supabase: SupabaseClient) {
	const now = new Date();
	await supabase
		.from('listings')
		.update({ status: 'archived' })
		.eq('status', 'published')
		.lt('expires_at', new Date(now.getTime() - 3 * 86400000).toISOString());

	const { data: old } = await supabase
		.from('listings')
		.select('id')
		.eq('status', 'archived')
		.lt('expires_at', new Date(now.getTime() - 30 * 86400000).toISOString())
		.or('photos.neq.{},og_image.not.is.null')
		.limit(10);
	for (const { id } of old ?? []) {
		const { data: files } = await supabase.storage.from('listing-photos').list(String(id));
		if (files?.length) await supabase.storage.from('listing-photos').remove(files.map((f) => `${id}/${f.name}`));
		await supabase.from('listings').update({ photos: [], og_image: null }).eq('id', id);
	}
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const view = (url.searchParams.get('view') ?? 'live') as keyof typeof VIEWS;
	const supabase = locals.supabase;
	await cleanUp(supabase).catch((e) => console.error('cleanup', e));

	const now = new Date().toISOString();
	let q = supabase.from('listings').select('*');
	if (view === 'live') q = q.eq('status', 'published').gt('expires_at', now);
	else if (view === 'expired') q = q.eq('status', 'published').lte('expires_at', now);
	else q = q.eq('status', view);

	const [{ data: listings }, { data: removals }, { data: reports }, { data: today }] = await Promise.all([
		q.order('created_at', { ascending: false }).limit(100),
		supabase
			.from('removal_requests')
			.select('id, listing_id, email, reason, created_at, listings(type, title)')
			.eq('handled', false)
			.order('created_at'),
		supabase
			.from('listing_reports')
			.select('id, listing_id, kind, note, created_at, listings(type, title, status)')
			.eq('handled', false)
			.order('created_at'),
		supabase
			.from('listings')
			.select('*')
			.eq('status', 'published')
			.gt('expires_at', now)
			.gte('published_at', new Date(Date.now() - 24 * 3600 * 1000).toISOString())
			.order('published_at')
	]);
	return {
		view,
		views: VIEWS,
		listings: (listings ?? []) as Listing[],
		removals: removals ?? [],
		reports: reports ?? [],
		today: (today ?? []) as Listing[],
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
	hide: async ({ locals, request }) => setStatus(locals, await request.formData(), 'hidden'),
	publish: async ({ locals, request }) => setStatus(locals, await request.formData(), 'published'),
	renew: async ({ locals, request }) => {
		const id = Number((await request.formData()).get('id'));
		const { error } = await locals.supabase.rpc('renew_listing', { listing: id });
		if (error) return fail(500, { message: error.message });
	},
	delete: async ({ locals, request }) => {
		const id = Number((await request.formData()).get('id'));
		const { data: files } = await locals.supabase.storage.from('listing-photos').list(String(id));
		if (files?.length) await locals.supabase.storage.from('listing-photos').remove(files.map((f) => `${id}/${f.name}`));
		const { error } = await locals.supabase.from('listings').delete().eq('id', id);
		if (error) return fail(500, { message: error.message });
	},
	handled: async ({ locals, request }) => {
		const id = Number((await request.formData()).get('id'));
		await locals.supabase.from('removal_requests').update({ handled: true }).eq('id', id);
	},
	/** Reports on one listing: keep it live (dismiss) or take it down. */
	reports: async ({ locals, request }) => {
		const form = await request.formData();
		const listingId = Number(form.get('listing_id'));
		const decision = form.get('decision');
		await locals.supabase.from('listing_reports').update({ handled: true }).eq('listing_id', listingId);
		if (decision === 'keep') {
			await locals.supabase.from('listings').update({ status: 'published' }).eq('id', listingId).eq('status', 'hidden');
		} else {
			await locals.supabase.from('listings').update({ status: 'archived' }).eq('id', listingId);
		}
	}
};
