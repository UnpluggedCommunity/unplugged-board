import { error, redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	const me = await locals.getMe();
	if (!me) redirect(303, `/login?next=${encodeURIComponent(url.pathname)}`);
	if (!me.isStaff) error(403, 'Staff only');
	return {};
};
