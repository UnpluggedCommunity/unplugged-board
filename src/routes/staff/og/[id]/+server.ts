import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/** Store the share-card image drawn by the browser and point the listing to it. */
export const POST: RequestHandler = async ({ locals, params, request }) => {
	const me = await locals.getMe();
	if (!me?.isStaff) error(403, 'Staff only');
	const id = Number(params.id);
	const image = await request.arrayBuffer();
	if (!Number.isInteger(id) || image.byteLength === 0 || image.byteLength > 1024 * 1024) error(400, 'Bad image');

	const path = `${id}/share-${Date.now()}.jpg`;
	const { error: upErr } = await locals.supabase.storage
		.from('listing-photos')
		.upload(path, image, { contentType: 'image/jpeg', cacheControl: '31536000' });
	if (upErr) error(500, upErr.message);
	const url = locals.supabase.storage.from('listing-photos').getPublicUrl(path).data.publicUrl;
	const { error: dbErr } = await locals.supabase.from('listings').update({ og_image: url }).eq('id', id);
	if (dbErr) error(500, dbErr.message);
	return json({ url });
};
