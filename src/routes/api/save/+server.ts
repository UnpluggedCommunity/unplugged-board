import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/** Toggle a saved listing for the logged-in user. */
export const POST: RequestHandler = async ({ locals, request }) => {
	const me = await locals.getMe();
	if (!me) error(401, 'Log in to save listings');
	const { id, save } = (await request.json()) as { id: number; save: boolean };
	if (!Number.isInteger(id)) error(400, 'Bad listing id');
	const table = locals.supabase.from('saved_listings');
	const { error: err } = save
		? await table.upsert({ user_id: me.id, listing_id: id })
		: await table.delete().eq('user_id', me.id).eq('listing_id', id);
	if (err) error(500, err.message);
	return json({ saved: save });
};
