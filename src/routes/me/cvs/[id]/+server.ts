import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/** Download one of your own CVs (RLS + storage policies keep it private). */
export const GET: RequestHandler = async ({ locals, params }) => {
	const me = await locals.getMe();
	if (!me) error(401, 'Log in first');
	const { data: cv } = await locals.supabase
		.from('cvs')
		.select('file_path, file_name')
		.eq('id', params.id)
		.eq('user_id', me.id)
		.maybeSingle();
	if (!cv) error(404, 'CV not found');
	const { data: blob, error: err } = await locals.supabase.storage.from('cvs').download(cv.file_path);
	if (err || !blob) error(404, 'File not found');
	return new Response(blob, {
		headers: {
			'content-type': blob.type || 'application/pdf',
			'content-disposition': `inline; filename="${cv.file_name.replace(/"/g, '')}"`,
			'cache-control': 'private, no-store'
		}
	});
};
