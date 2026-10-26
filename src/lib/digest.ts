/** "Daily digest" messages for the Unplugged WhatsApp sub-groups. */
import { categoryEmoji, formatPrice, listingPath, place, type Listing } from './format';

export const GROUPS = [
	{ id: 'jobs', name: 'Jobs Board', path: '/jobs', test: (l: Listing) => l.type === 'job' && !isFarm(l) },
	{ id: 'farm', name: 'Farm Jobs', path: '/jobs?cat=farm', test: (l: Listing) => l.type === 'job' && isFarm(l) },
	{ id: 'rooms', name: 'Rooms', path: '/rooms', test: (l: Listing) => l.type === 'room' }
] as const;

function isFarm(l: Listing) {
	return l.job_category === 'farm' || l.whv_417 === 'likely';
}

export function digestText(group: (typeof GROUPS)[number], listings: Listing[], origin: string) {
	const host = origin.replace(/^https?:\/\//, '');
	const date = new Date().toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Australia/Perth' });
	const items = listings.filter(group.test);
	const lines = [`🗞️ *Unplugged ${group.name} — ${date.replace(',', '')}*`, `${items.length} new in the last 24h:`, ''];
	for (const l of items) {
		const facts = [place(l), formatPrice(l)].filter(Boolean).join(' · ');
		lines.push(`${categoryEmoji(l)} *${l.title}*${facts ? ` — ${facts}` : ''}`, `👉 ${host}${listingPath(l)}`, '');
	}
	lines.push(`All ${group.name.toLowerCase()}: ${host}${group.path}`);
	return { text: lines.join('\n'), count: items.length };
}
