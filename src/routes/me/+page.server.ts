import { completeness, missingForApply } from '$lib/profile';
import { loadCvs, loadJobProfile } from '$lib/server/profile';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const me = (await locals.getMe())!;
	const [profile, cvs, apps, saved] = await Promise.all([
		loadJobProfile(locals.supabase, me.id),
		loadCvs(locals.supabase, me.id),
		locals.supabase.from('applications').select('id', { count: 'exact', head: true }).eq('user_id', me.id),
		locals.supabase.from('saved_listings').select('listing_id', { count: 'exact', head: true }).eq('user_id', me.id)
	]);
	return {
		profile,
		percent: completeness(profile),
		missing: missingForApply(profile),
		cvCount: cvs.length,
		appCount: apps.count ?? 0,
		savedCount: saved.count ?? 0
	};
};
