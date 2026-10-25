import { loadBoard, readFilters, savedIds } from '$lib/server/listings';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const filters = readFilters(url);
	const [listings, saved] = await Promise.all([
		loadBoard(locals.supabase, 'job', filters),
		savedIds(locals.supabase, await locals.getMe())
	]);
	return { origin: url.origin, filters, listings, saved };
};
