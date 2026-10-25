import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const me = await locals.getMe();
	if (!me) redirect(303, `/login?next=${encodeURIComponent(url.pathname)}`);
	if (!me.isAdmin) error(403, 'Admins only');

	const [{ data: staff }, { data: invites }, { data: access }] = await Promise.all([
		locals.supabase
			.from('profiles')
			.select('id, email, display_name, role')
			.in('role', ['staff', 'admin'])
			.order('role'),
		locals.supabase.from('staff_invites').select('email, role').order('email'),
		locals.supabase.rpc('access_settings')
	]);
	const active = new Set((staff ?? []).map((s) => s.email));
	return {
		codeRequired: (access?.[0]?.code_required as boolean | undefined) ?? true,
		staff: staff ?? [],
		pending: (invites ?? []).filter((i) => !active.has(i.email))
	};
};

export const actions: Actions = {
	code: async ({ locals, request }) => {
		const form = await request.formData();
		const code = String(form.get('code') ?? '').trim();
		if (code.length < 4) return fail(400, { codeMessage: 'Use at least 4 characters.' });
		const { error: err } = await locals.supabase.rpc('set_access_code', { new_code: code });
		if (err) return fail(500, { codeMessage: err.message });
		return { codeSaved: code.toUpperCase() };
	},
	codeOff: async ({ locals }) => {
		const { error: err } = await locals.supabase.rpc('set_code_required', { required: false });
		if (err) return fail(500, { codeMessage: err.message });
		return { codeOffDone: true };
	},
	invite: async ({ locals, request }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '').trim().toLowerCase();
		const role = form.get('role') === 'admin' ? 'admin' : 'staff';
		if (!/^\S+@\S+\.\S+$/.test(email)) return fail(400, { staffMessage: 'Enter a valid email.' });
		const { error: err } = await locals.supabase.from('staff_invites').upsert({ email, role });
		if (err) return fail(500, { staffMessage: err.message });
		return { staffMessage: `${email} is now ${role}. If they never logged in, it applies on their first login.` };
	},
	remove: async ({ locals, request }) => {
		const me = (await locals.getMe())!;
		const email = String((await request.formData()).get('email') ?? '').toLowerCase();
		if (email === me.email) return fail(400, { staffMessage: "You can't remove yourself." });
		await locals.supabase.from('staff_invites').delete().eq('email', email);
		const { error: err } = await locals.supabase.from('profiles').update({ role: 'member' }).eq('email', email);
		if (err) return fail(500, { staffMessage: err.message });
		return { staffMessage: `${email} is now a regular member.` };
	}
};
