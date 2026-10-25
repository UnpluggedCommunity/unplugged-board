import type { SupabaseClient } from '@supabase/supabase-js';
import { emptyProfile, type Cv, type Experience, type JobProfile } from '$lib/profile';

export async function loadJobProfile(supabase: SupabaseClient, userId: string): Promise<JobProfile | null> {
	const { data } = await supabase.from('job_profiles').select('*').eq('user_id', userId).maybeSingle();
	if (!data) return null;
	const p = { ...emptyProfile(), ...data } as JobProfile & { user_id?: string; updated_at?: string };
	delete p.user_id;
	delete p.updated_at;
	p.experience = Array.isArray(p.experience) ? p.experience : [];
	return p;
}

export async function loadCvs(supabase: SupabaseClient, userId: string): Promise<Cv[]> {
	const { data } = await supabase
		.from('cvs')
		.select('id, label, categories, file_name, file_path, size_bytes, created_at')
		.eq('user_id', userId)
		.order('created_at');
	return (data ?? []) as Cv[];
}

const text = (v: FormDataEntryValue | null) => {
	const s = String(v ?? '').trim();
	return s ? s.slice(0, 2000) : null;
};
const bool = (v: FormDataEntryValue | null) => (v === 'yes' ? true : v === 'no' ? false : null);
const date = (v: FormDataEntryValue | null) => {
	const s = String(v ?? '');
	return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
};
const list = (values: FormDataEntryValue[]) =>
	[...new Set(values.flatMap((v) => String(v).split(',')).map((s) => s.trim()).filter(Boolean))].slice(0, 30);

/** Parse the profile wizard form. Experience rows come as exp_role[], exp_company[], … */
export function parseProfileForm(form: FormData): JobProfile {
	const roles = form.getAll('exp_role');
	const experience: Experience[] = roles
		.map((_, i) => ({
			role: String(roles[i] ?? '').trim().slice(0, 120),
			company: String(form.getAll('exp_company')[i] ?? '').trim().slice(0, 120),
			place: String(form.getAll('exp_place')[i] ?? '').trim().slice(0, 120),
			dates: String(form.getAll('exp_dates')[i] ?? '').trim().slice(0, 60),
			details: String(form.getAll('exp_details')[i] ?? '').trim().slice(0, 600)
		}))
		.filter((e) => e.role)
		.slice(0, 12);

	return {
		full_name: text(form.get('full_name')),
		phone: text(form.get('phone')),
		email: text(form.get('email')),
		suburb: text(form.get('suburb')),
		visa_type: text(form.get('visa_type')),
		visa_expiry: date(form.get('visa_expiry')),
		available_from: date(form.get('available_from')),
		goal: text(form.get('goal')),
		wanted_categories: list(form.getAll('wanted_categories')),
		licence: text(form.get('licence')),
		own_car: bool(form.get('own_car')),
		relocate: bool(form.get('relocate')),
		tickets: list([...form.getAll('tickets'), form.get('tickets_other') ?? '']),
		planned_tickets: list([form.get('planned_tickets') ?? '']),
		education: text(form.get('education')),
		english_level: text(form.get('english_level')),
		languages: text(form.get('languages')),
		experience,
		strengths: text(form.get('strengths')),
		about: text(form.get('about'))
	};
}
