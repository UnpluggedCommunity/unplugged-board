/**
 * Single source of truth for listing fields: used by the staff form, the
 * "Paste JSON" import and (later) the AI extraction schema.
 */
import {
	BILLS,
	EMPLOYMENT_TYPES,
	JOB_CATEGORIES,
	PAY_UNITS,
	ROOM_TYPES,
	WHV_417,
	ZONES,
	type ListingType
} from './constants';

type Option = { id: string; label: string };

export interface FieldDef {
	name: string;
	label: string;
	kind: 'text' | 'textarea' | 'number' | 'select' | 'bool' | 'date' | 'tags';
	options?: Option[];
	/** Which listing types show this field. */
	types: ListingType[];
	/** Stored in listing_private (members only). */
	private?: boolean;
	required?: boolean;
	hint?: string;
	wide?: boolean;
}

const ALL: ListingType[] = ['job', 'room', 'item'];
const JOB: ListingType[] = ['job'];
const ROOM: ListingType[] = ['room'];

export const FIELDS: FieldDef[] = [
	{ name: 'title', label: 'Title', kind: 'text', types: ALL, required: true, wide: true },
	{ name: 'job_category', label: 'Category', kind: 'select', options: JOB_CATEGORIES, types: JOB },
	{ name: 'suburb', label: 'Suburb / town', kind: 'text', types: ALL },
	{ name: 'zone', label: 'Zone', kind: 'select', options: ZONES, types: ALL, hint: 'Auto-filled from the suburb when empty' },

	{ name: 'pay_amount', label: 'Pay (AUD)', kind: 'number', types: JOB },
	{ name: 'pay_amount_max', label: 'Pay up to (AUD)', kind: 'number', types: JOB },
	{ name: 'pay_unit', label: 'Pay unit', kind: 'select', options: PAY_UNITS, types: JOB },
	{ name: 'pay_cash', label: 'Cash', kind: 'bool', types: JOB },
	{ name: 'employment_type', label: 'Employment type', kind: 'select', options: EMPLOYMENT_TYPES, types: JOB },
	{ name: 'start_date', label: 'Start date', kind: 'date', types: JOB },
	{ name: 'start_text', label: 'Start (text)', kind: 'text', types: JOB, hint: 'e.g. ASAP — used when there is no exact date' },
	{ name: 'hours_text', label: 'Duration / hours / roster', kind: 'text', types: JOB, wide: true },
	{ name: 'req_tickets', label: 'Tickets required', kind: 'tags', types: JOB, hint: 'Comma separated: White Card, RSA, Forklift' },
	{ name: 'req_own_car', label: 'Own car required', kind: 'bool', types: JOB },
	{ name: 'req_experience', label: 'Experience', kind: 'text', types: JOB },
	{ name: 'req_english', label: 'English level', kind: 'text', types: JOB },
	{ name: 'accommodation_provided', label: 'Accommodation provided', kind: 'bool', types: JOB },
	{ name: 'accommodation_text', label: 'Accommodation details', kind: 'text', types: JOB },
	{ name: 'whv_417', label: 'WHV 417 specified work', kind: 'select', options: WHV_417, types: JOB, hint: 'Staff confirms. Always verify on Home Affairs.' },

	{ name: 'rent_week', label: 'Rent (AUD / week)', kind: 'number', types: ROOM },
	{ name: 'rent_from_month', label: 'Converted from monthly', kind: 'bool', types: ROOM },
	{ name: 'bond', label: 'Bond (AUD)', kind: 'number', types: ROOM },
	{ name: 'bills', label: 'Bills', kind: 'select', options: BILLS, types: ROOM },
	{ name: 'room_type', label: 'Room type', kind: 'select', options: ROOM_TYPES, types: ROOM },
	{ name: 'furnished', label: 'Furnished', kind: 'bool', types: ROOM },
	{ name: 'available_from', label: 'Available from', kind: 'date', types: ROOM },
	{ name: 'min_stay', label: 'Minimum stay', kind: 'text', types: ROOM },
	{ name: 'couples_ok', label: 'Couples OK', kind: 'bool', types: ROOM },
	{ name: 'gender_pref', label: 'Gender preference', kind: 'text', types: ROOM },
	{ name: 'parking', label: 'Parking', kind: 'text', types: ROOM },
	{ name: 'transport', label: 'Public transport', kind: 'text', types: ROOM, wide: true },

	{ name: 'summary', label: 'Short description', kind: 'textarea', types: ALL, wide: true, hint: '2–3 sentences in clear English' },
	{ name: 'posted_at', label: 'Facebook post date', kind: 'date', types: ALL, hint: 'Expiry is counted from this date' },

	{ name: 'contact_name', label: 'Contact name / company', kind: 'text', types: ALL, private: true },
	{ name: 'contact_phone', label: 'Phone', kind: 'text', types: ALL, private: true },
	{ name: 'contact_email', label: 'Email', kind: 'text', types: ALL, private: true },
	{ name: 'apply_url', label: 'Apply link', kind: 'text', types: ALL, private: true },
	{ name: 'original_url', label: 'Original post link', kind: 'text', types: ALL, private: true, wide: true }
];

export const fieldsFor = (type: ListingType) => FIELDS.filter((f) => f.types.includes(type));

/** Raw string values as shown in the form inputs. */
export type FormValues = Record<string, string>;

const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

function toBool(v: unknown): boolean | null {
	if (typeof v === 'boolean') return v;
	const s = String(v ?? '').trim().toLowerCase();
	if (['true', 'yes', 'y', '1'].includes(s)) return true;
	if (['false', 'no', 'n', '0'].includes(s)) return false;
	return null;
}

function toNumber(v: unknown): number | null {
	if (typeof v === 'number') return Number.isFinite(v) ? v : null;
	const s = String(v ?? '').replace(/[$,\s]|aud/gi, '');
	if (!s) return null;
	const n = Number(s);
	return Number.isFinite(n) ? n : null;
}

function toText(v: unknown): string | null {
	if (v == null) return null;
	const s = String(v).trim();
	return s && s.toLowerCase() !== 'not specified' && s.toLowerCase() !== 'null' ? s : null;
}

/** Normalise one value from the form or from JSON into its database value. */
export function normalise(f: FieldDef, v: unknown): unknown {
	switch (f.kind) {
		case 'number':
			return toNumber(v);
		case 'bool':
			return toBool(v);
		case 'select': {
			const s = toText(v);
			if (!s) return f.name === 'whv_417' ? 'unknown' : null;
			const opt = f.options!.find((o) => o.id === s || o.label.toLowerCase() === s.toLowerCase());
			return opt ? opt.id : f.name === 'whv_417' ? 'unknown' : null;
		}
		case 'date': {
			const s = toText(v);
			return s && isDate(s.slice(0, 10)) ? s.slice(0, 10) : null;
		}
		case 'tags': {
			const arr = Array.isArray(v) ? v : String(v ?? '').split(',');
			return arr.map((x) => String(x).trim()).filter(Boolean);
		}
		default:
			return toText(v);
	}
}

/** Database value → string for the form input. */
export function toInput(f: FieldDef, v: unknown): string {
	if (v == null) return '';
	if (f.kind === 'bool') return v === true ? 'yes' : v === false ? 'no' : '';
	if (f.kind === 'tags') return Array.isArray(v) ? v.join(', ') : String(v);
	if (f.kind === 'date') return String(v).slice(0, 10);
	if (f.kind === 'select') return String(normalise(f, v) ?? '');
	return String(v);
}

export function toFormValues(type: ListingType, source: Record<string, unknown>): FormValues {
	const out: FormValues = {};
	for (const f of fieldsFor(type)) out[f.name] = toInput(f, source[f.name]);
	return out;
}

export interface Parsed {
	listing: Record<string, unknown>;
	priv: Record<string, unknown>;
	errors: string[];
}

export function parseValues(type: ListingType, source: Record<string, unknown>): Parsed {
	const listing: Record<string, unknown> = { type };
	const priv: Record<string, unknown> = {};
	const errors: string[] = [];
	for (const f of fieldsFor(type)) {
		const value = normalise(f, source[f.name]);
		if (f.required && (value == null || value === '')) errors.push(`${f.label} is required`);
		(f.private ? priv : listing)[f.name] = value;
	}
	if (type === 'room') listing.rent_from_month = listing.rent_from_month ?? false;
	if (listing.posted_at) listing.posted_at = `${listing.posted_at}T08:00:00+08:00`;
	for (const key of ['apply_url', 'original_url']) {
		const url = priv[key] as string | null;
		if (url && !/^https?:\/\//i.test(url)) priv[key] = 'https://' + url;
	}
	return { listing, priv, errors };
}
