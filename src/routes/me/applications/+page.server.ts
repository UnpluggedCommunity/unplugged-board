import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const me = (await locals.getMe())!;
	const { data } = await locals.supabase
		.from('applications')
		.select('id, listing_id, listing_title, channel, recipient, subject, body, sent_by_platform, created_at, cvs(label)')
		.eq('user_id', me.id)
		.order('created_at', { ascending: false })
		.limit(100);
	return { applications: data ?? [] };
};
