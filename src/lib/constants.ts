export type ListingType = 'job' | 'room' | 'item';

export const SECTIONS = {
	job: { path: '/jobs', short: '/j', label: 'Jobs', singular: 'job' },
	room: { path: '/rooms', short: '/r', label: 'Rooms', singular: 'room' }
} as const;

export type ZoneGroup = 'metro' | 'regional' | 'interstate';

export const ZONES: { id: string; label: string; group: ZoneGroup }[] = [
	{ id: 'cbd', label: 'CBD', group: 'metro' },
	{ id: 'north', label: 'Northern Suburbs', group: 'metro' },
	{ id: 'south', label: 'Southern Suburbs', group: 'metro' },
	{ id: 'east', label: 'Eastern Suburbs', group: 'metro' },
	{ id: 'freo', label: 'Fremantle & Coast', group: 'metro' },
	{ id: 'south-west', label: 'South West', group: 'regional' },
	{ id: 'wheatbelt', label: 'Wheatbelt', group: 'regional' },
	{ id: 'great-southern', label: 'Great Southern', group: 'regional' },
	{ id: 'pilbara-kimberley', label: 'Pilbara & Kimberley', group: 'regional' },
	{ id: 'goldfields', label: 'Goldfields', group: 'regional' },
	{ id: 'rest-wa', label: 'Rest of WA', group: 'regional' },
	{ id: 'nsw', label: 'NSW', group: 'interstate' },
	{ id: 'vic', label: 'VIC', group: 'interstate' },
	{ id: 'qld', label: 'QLD', group: 'interstate' },
	{ id: 'sa', label: 'SA', group: 'interstate' },
	{ id: 'tas', label: 'TAS', group: 'interstate' },
	{ id: 'nt', label: 'NT', group: 'interstate' },
	{ id: 'act', label: 'ACT', group: 'interstate' }
];

export const ZONE_GROUPS: { id: ZoneGroup; label: string }[] = [
	{ id: 'metro', label: 'Perth Metro' },
	{ id: 'regional', label: 'Regional WA' },
	{ id: 'interstate', label: 'Other states' }
];

export const zoneLabel = (id: string | null | undefined) =>
	ZONES.find((z) => z.id === id)?.label ?? null;

/** Zone ids matched by a filter value, which can be a zone id or a group id. */
export function zonesForFilter(value: string): string[] {
	const group = ZONE_GROUPS.find((g) => g.id === value);
	if (group) return ZONES.filter((z) => z.group === group.id).map((z) => z.id);
	return ZONES.some((z) => z.id === value) ? [value] : [];
}

export const JOB_CATEGORIES = [
	{ id: 'hospitality', label: 'Hospitality', emoji: '🍽️' },
	{ id: 'construction', label: 'Construction/Trades', emoji: '🛠️' },
	{ id: 'farm', label: 'Farm & Regional', emoji: '🚜' },
	{ id: 'cleaning', label: 'Cleaning', emoji: '🧽' },
	{ id: 'warehouse', label: 'Warehouse/Logistics', emoji: '📦' },
	{ id: 'retail', label: 'Retail', emoji: '🛍️' },
	{ id: 'care', label: 'Aged Care/Disability', emoji: '🤝' },
	{ id: 'childcare', label: 'Childcare/Au pair', emoji: '🧸' },
	{ id: 'mining', label: 'Mining/FIFO', emoji: '⛏️' },
	{ id: 'other', label: 'Other', emoji: '💼' }
];

export const jobCategory = (id: string | null | undefined) =>
	JOB_CATEGORIES.find((c) => c.id === id) ?? null;

export const PAY_UNITS = [
	{ id: 'hour', label: 'per hour', short: '/h' },
	{ id: 'day', label: 'per day', short: '/day' },
	{ id: 'week', label: 'per week', short: '/wk' },
	{ id: 'annual', label: 'per year', short: '/yr' },
	{ id: 'piece', label: 'piece rate', short: ' piece rate' }
];

export const EMPLOYMENT_TYPES = [
	{ id: 'casual', label: 'Casual' },
	{ id: 'part-time', label: 'Part-time' },
	{ id: 'full-time', label: 'Full-time' },
	{ id: 'contract', label: 'Contract' }
];

export const WHV_417 = [
	{ id: 'unknown', label: 'Unknown' },
	{ id: 'likely', label: 'Likely eligible' },
	{ id: 'not_eligible', label: 'Not eligible' }
];

export const BILLS = [
	{ id: 'included', label: 'Bills included' },
	{ id: 'not_included', label: 'Bills not included' },
	{ id: 'partial', label: 'Some bills included' }
];

export const ROOM_TYPES = [
	{ id: 'single', label: 'Single room' },
	{ id: 'double', label: 'Double room' },
	{ id: 'shared', label: 'Shared room' }
];

export const WHV_SPECIFIED_WORK_URL =
	'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/work-holiday-417/specified-work';

export const LIFETIME_DAYS: Record<ListingType, number> = { job: 10, room: 14, item: 30 };

export const SITE_NAME = 'Unplugged Board';
export const TAGLINE = 'Arrive alone. Leave with a crew.';
