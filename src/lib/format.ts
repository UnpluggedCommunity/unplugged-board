import {
	BILLS,
	EMPLOYMENT_TYPES,
	PAY_UNITS,
	ROOM_TYPES,
	SECTIONS,
	jobCategory,
	zoneLabel,
	type ListingType
} from './constants';

export interface Listing {
	id: number;
	type: ListingType;
	status: string;
	title: string;
	summary: string | null;
	zone: string | null;
	suburb: string | null;
	job_category: string | null;
	pay_amount: number | null;
	pay_amount_max: number | null;
	pay_unit: string | null;
	pay_cash: boolean | null;
	employment_type: string | null;
	start_date: string | null;
	start_text: string | null;
	hours_text: string | null;
	req_tickets: string[];
	req_own_car: boolean | null;
	req_experience: string | null;
	req_english: string | null;
	accommodation_provided: boolean | null;
	accommodation_text: string | null;
	whv_417: 'likely' | 'not_eligible' | 'unknown';
	rent_week: number | null;
	rent_from_month: boolean;
	bond: number | null;
	bills: string | null;
	room_type: string | null;
	furnished: boolean | null;
	available_from: string | null;
	min_stay: string | null;
	couples_ok: boolean | null;
	gender_pref: string | null;
	parking: string | null;
	transport: string | null;
	photos: string[];
	og_image: string | null;
	apply_channel?: 'email' | 'phone' | 'link' | null;
	posted_at: string | null;
	published_at: string | null;
	expires_at: string | null;
	created_at: string;
}

export interface ListingPrivate {
	contact_name: string | null;
	contact_phone: string | null;
	contact_email: string | null;
	apply_url: string | null;
	original_url: string | null;
}

const TZ = 'Australia/Perth';

const money = (n: number) =>
	'$' + (Number.isInteger(n) ? n.toLocaleString('en-AU') : n.toFixed(2));

export function formatPay(l: Pick<Listing, 'pay_amount' | 'pay_amount_max' | 'pay_unit' | 'pay_cash'>) {
	if (l.pay_amount == null) return null;
	const unit = PAY_UNITS.find((u) => u.id === l.pay_unit)?.short ?? '';
	const range =
		l.pay_amount_max && l.pay_amount_max > l.pay_amount
			? `${money(l.pay_amount)}–${money(l.pay_amount_max)}`
			: money(l.pay_amount);
	return `${range}${unit}${l.pay_cash ? ' cash' : ''}`;
}

export const formatRent = (l: Pick<Listing, 'rent_week'>) =>
	l.rent_week == null ? null : `${money(l.rent_week)}/wk`;

export function formatPrice(l: Listing) {
	return l.type === 'job' ? formatPay(l) : formatRent(l);
}

/** "Mon 2 Nov" — dates are stored as YYYY-MM-DD (no time zone). */
export function formatDay(date: string | null) {
	if (!date) return null;
	const d = new Date(date.length === 10 ? date + 'T12:00:00Z' : date);
	return d.toLocaleDateString('en-AU', {
		weekday: 'short',
		day: 'numeric',
		month: 'short',
		timeZone: date.length === 10 ? 'UTC' : TZ
	}).replace(',', '');
}

export function timeAgo(iso: string | null, now = Date.now()) {
	if (!iso) return null;
	const mins = Math.round((now - new Date(iso).getTime()) / 60000);
	if (mins < 60) return `${Math.max(mins, 1)}m ago`;
	const hours = Math.round(mins / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.round(hours / 24);
	return `${days}d ago`;
}

export const isNew = (l: Pick<Listing, 'published_at'>, now = Date.now()) =>
	!!l.published_at && now - new Date(l.published_at).getTime() < 24 * 3600 * 1000;

export function place(l: Pick<Listing, 'suburb' | 'zone'>) {
	return l.suburb || zoneLabel(l.zone) || null;
}

export function startText(l: Listing) {
	if (l.type === 'job') {
		if (l.start_date) return `Start ${formatDay(l.start_date)}`;
		return l.start_text ? `Start ${l.start_text}` : null;
	}
	return l.available_from ? `From ${formatDay(l.available_from)}` : null;
}

export const labelOf = (list: { id: string; label: string }[], id: string | null) =>
	list.find((x) => x.id === id)?.label ?? null;

/** Short key facts used in the card chips and in WhatsApp messages. */
export function keyFacts(l: Listing): string[] {
	const facts: string[] = [];
	if (l.type === 'job') {
		const emp = labelOf(EMPLOYMENT_TYPES, l.employment_type);
		if (emp) facts.push(emp);
		if (l.req_tickets.length) facts.push(l.req_tickets.join(', ') + ' required');
		if (l.req_own_car) facts.push('Own car');
		if (l.accommodation_provided) facts.push('Accommodation provided');
	} else if (l.type === 'room') {
		const rt = labelOf(ROOM_TYPES, l.room_type);
		if (rt) facts.push(rt);
		const bills = labelOf(BILLS, l.bills);
		if (bills) facts.push(bills);
		if (l.furnished) facts.push('Furnished');
		if (l.couples_ok) facts.push('Couples OK');
		if (l.bond != null) facts.push(`Bond ${money(l.bond)}`);
	}
	return facts;
}

export function categoryEmoji(l: Listing) {
	if (l.type === 'room') return '🏠';
	return jobCategory(l.job_category)?.emoji ?? '💼';
}

export function listingPath(l: Pick<Listing, 'type' | 'id'>) {
	return `${SECTIONS[l.type as 'job' | 'room'].short}/${l.id}`;
}

/** WhatsApp-formatted message: key info in the text, one link, ≤ 8 lines. */
export function whatsappText(l: Listing, origin: string) {
	const where = place(l);
	const lines = [`${categoryEmoji(l)} *${l.title}${where && !l.title.includes(where) ? ` — ${where}` : ''}*`];
	const second = [
		formatPrice(l) && `💰 ${formatPrice(l)}`,
		startText(l) && `📅 ${startText(l)}`
	].filter(Boolean);
	if (second.length) lines.push(second.join(' · '));
	const facts = keyFacts(l);
	if (facts.length) lines.push(`✅ ${facts.slice(0, 3).join(' · ')}`);
	if (l.type === 'job' && l.whv_417 === 'likely') lines.push('🌾 417 specified work: likely eligible');
	lines.push(`👉 Details & contact: ${origin}${listingPath(l)}`);
	return lines.join('\n');
}

/** Plain one-line description for Open Graph / meta tags. */
export function metaDescription(l: Listing) {
	return [formatPrice(l), place(l), startText(l), ...keyFacts(l).slice(0, 2)]
		.filter(Boolean)
		.join(' · ');
}
