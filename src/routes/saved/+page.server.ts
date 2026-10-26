import { redirect } from '@sveltejs/kit';
import type { Listing } from '$lib/format';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const me = await locals.getMe();
	if (!me) redirect(303, `/login?next=${encodeURIComponent(url.pathname)}`);
	const { data } = await locals.supabase
		.from('saved_listings')
		.select('created_at, listings(*)')
		.eq('user_id', me.id)
		.order('created_at', { ascending: false });
	const now = Date.now();
	const rows = (data ?? []).map((r) => r.listings as unknown as Listing | null).filter((l): l is Listing => !!l);
	const live = (l: Listing) => l.status === 'published' && !!l.expires_at && new Date(l.expires_at).getTime() > now;
	return { live: rows.filter(live), gone: rows.filter((l) => !live(l)) };
};
