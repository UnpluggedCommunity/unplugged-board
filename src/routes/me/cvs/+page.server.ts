import { fail } from '@sveltejs/kit';
import { loadCvs } from '$lib/server/profile';
import type { Actions, PageServerLoad } from './$types';

const MAX_BYTES = 2 * 1024 * 1024;
const TYPES: Record<string, string> = {
	'application/pdf': 'pdf',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
	'application/msword': 'doc'
};

export const load: PageServerLoad = async ({ locals }) => {
	const me = (await locals.getMe())!;
	return { cvs: await loadCvs(locals.supabase, me.id) };
};

export const actions: Actions = {
	upload: async ({ locals, request }) => {
		const me = (await locals.getMe())!;
		const form = await request.formData();
		const file = form.get('file');
		const label = String(form.get('label') ?? '').trim().slice(0, 60);
		const categories = form.getAll('categories').map(String).slice(0, 10);

		if (!(file instanceof File) || file.size === 0) return fail(400, { message: 'Choose a file.' });
		if (!label) return fail(400, { message: 'Give this CV a name, e.g. "Hospitality CV".' });
		const ext = TYPES[file.type] ?? (/\.pdf$/i.test(file.name) ? 'pdf' : null);
		if (!ext) return fail(400, { message: 'Upload a PDF (best) or a Word file.' });
		if (file.size > MAX_BYTES) return fail(400, { message: 'The file is over 2 MB — export a lighter PDF.' });

		const { count } = await locals.supabase.from('cvs').select('id', { count: 'exact', head: true }).eq('user_id', me.id);
		if ((count ?? 0) >= 3) return fail(400, { message: 'You can keep up to 3 CVs. Delete one first.' });

		const path = `${me.id}/${crypto.randomUUID()}.${ext}`;
		const { error: upErr } = await locals.supabase.storage
			.from('cvs')
			.upload(path, file, { contentType: file.type || 'application/pdf', upsert: false });
		if (upErr) {
			console.error('cv upload', upErr);
			return fail(500, { message: 'Upload failed. Please try again.' });
		}
		const { error } = await locals.supabase.from('cvs').insert({
			user_id: me.id,
			label,
			categories,
			file_path: path,
			file_name: file.name.slice(0, 120),
			size_bytes: file.size
		});
		if (error) {
			await locals.supabase.storage.from('cvs').remove([path]);
			return fail(500, { message: error.message.includes('cv_limit') ? 'You can keep up to 3 CVs.' : 'Could not save the CV.' });
		}
		return { uploaded: label };
	},
	delete: async ({ locals, request }) => {
		const me = (await locals.getMe())!;
		const id = String((await request.formData()).get('id'));
		const { data } = await locals.supabase.from('cvs').select('file_path').eq('id', id).eq('user_id', me.id).maybeSingle();
		if (!data) return fail(404, { message: 'CV not found.' });
		await locals.supabase.storage.from('cvs').remove([data.file_path]);
		await locals.supabase.from('cvs').delete().eq('id', id);
		return { deleted: true };
	}
};
