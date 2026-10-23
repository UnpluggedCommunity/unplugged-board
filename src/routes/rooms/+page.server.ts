import { loadBoard, readFilters } from '$lib/server/listings';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const filters = readFilters(url);
	return { origin: url.origin, filters, listings: await loadBoard(locals.supabase, 'room', filters) };
};
