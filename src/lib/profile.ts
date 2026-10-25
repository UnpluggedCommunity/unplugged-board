/** Job profile: asked once, reused for every application. */

export interface Experience {
	role: string;
	company: string;
	place: string;
	dates: string;
	details: string;
}

export interface JobProfile {
	full_name: string | null;
	phone: string | null;
	email: string | null;
	suburb: string | null;
	visa_type: string | null;
	visa_expiry: string | null;
	available_from: string | null;
	goal: string | null;
	wanted_categories: string[];
	licence: string | null;
	own_car: boolean | null;
	relocate: boolean | null;
	tickets: string[];
	planned_tickets: string[];
	education: string | null;
	english_level: string | null;
	languages: string | null;
	experience: Experience[];
	strengths: string | null;
	about: string | null;
}

export interface Cv {
	id: string;
	label: string;
	categories: string[];
	file_name: string;
	file_path: string;
	size_bytes: number | null;
	created_at: string;
}

export const VISA_TYPES = [
	{ id: '417', label: 'Working Holiday (417)' },
	{ id: '462', label: 'Work and Holiday (462)' },
	{ id: 'student', label: 'Student visa' },
	{ id: 'graduate', label: 'Graduate visa (485)' },
	{ id: 'sponsored', label: 'Employer sponsored' },
	{ id: 'pr', label: 'Permanent resident' },
	{ id: 'citizen', label: 'Australian / NZ citizen' },
	{ id: 'other', label: 'Other' }
];

export const GOALS = [
	{ id: 'long_term', label: 'A long-term, full-time job' },
	{ id: 'sponsorship', label: 'A job that could sponsor my visa' },
	{ id: 'casual', label: 'Casual or short-term work' },
	{ id: 'any', label: 'Anything — I just want to work' }
];

export const ENGLISH_LEVELS = [
	{ id: 'basic', label: 'Basic — I get by' },
	{ id: 'good', label: 'Good — I work without problems' },
	{ id: 'fluent', label: 'Fluent' },
	{ id: 'native', label: 'Native' }
];

export const LICENCES = [
	{ id: 'none', label: 'No licence' },
	{ id: 'overseas', label: 'Overseas licence' },
	{ id: 'C', label: 'Australian C (car)' },
	{ id: 'LR', label: 'Light Rigid (LR)' },
	{ id: 'MR', label: 'Medium Rigid (MR)' },
	{ id: 'HR', label: 'Heavy Rigid (HR)' },
	{ id: 'HC', label: 'Heavy Combination (HC)' }
];

export const COMMON_TICKETS = [
	'White Card',
	'RSA',
	'RCG',
	'Food Safety',
	'Forklift (LF)',
	'Working at Heights',
	'Confined Spaces',
	'EWP',
	'First Aid',
	'Working with Children',
	'Police Clearance',
	'Traffic Control',
	'Barista course'
];

export const EMPTY_EXPERIENCE: Experience = { role: '', company: '', place: '', dates: '', details: '' };

export function emptyProfile(): JobProfile {
	return {
		full_name: null,
		phone: null,
		email: null,
		suburb: null,
		visa_type: null,
		visa_expiry: null,
		available_from: null,
		goal: null,
		wanted_categories: [],
		licence: null,
		own_car: null,
		relocate: null,
		tickets: [],
		planned_tickets: [],
		education: null,
		english_level: null,
		languages: null,
		experience: [],
		strengths: null,
		about: null
	};
}

/** What's still missing before the AI can write a good application. */
export function missingForApply(p: JobProfile | null): string[] {
	if (!p) return ['your job profile'];
	const missing: string[] = [];
	if (!p.full_name) missing.push('your name');
	if (!p.phone && !p.email) missing.push('a phone or email');
	if (!p.visa_type) missing.push('your visa');
	if (!p.experience.some((e) => e.role)) missing.push('at least one job in your experience');
	return missing;
}

/** 0–100, used for the progress bar on the profile hub. */
export function completeness(p: JobProfile | null) {
	if (!p) return 0;
	const checks = [
		p.full_name,
		p.phone,
		p.email,
		p.suburb,
		p.visa_type,
		p.available_from,
		p.goal,
		p.wanted_categories.length,
		p.licence,
		p.own_car != null,
		p.tickets.length,
		p.english_level,
		p.experience.some((e) => e.role),
		p.experience.length > 1,
		p.strengths
	];
	return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export const firstName = (p: Pick<JobProfile, 'full_name'> | null) =>
	p?.full_name?.trim().split(/\s+/)[0] ?? null;
