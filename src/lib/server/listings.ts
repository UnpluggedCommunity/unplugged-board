import { error } from '@sveltejs/kit';
import type { SupabaseClient } from '@supabase/supabase-js';
import { zonesForFilter, type ListingType } from '$lib/constants';
import type { Listing, ListingPrivate } from '$lib/format';

export interface BoardFilters {
	zone: string;
	cat: string;
	min: string;
	max: string;
	posted: string;
	type: string;
	sort: string;
	q: string;
}

export function readFilters(url: URL): BoardFilters {
	const p = url.searchParams;
	return {
		zone: p.get('zone') ?? '',
		cat: p.get('cat') ?? '',
		min: p.get('min') ?? '',
		max: p.get('max') ?? '',
		posted: p.get('posted') ?? '',
		type: p.get('rt') ?? '',
		sort: p.get('sort') ?? 'newest',
		q: (p.get('q') ?? '').slice(0, 60)
	};
}

const PAGE_SIZE = 60;

export async function loadBoard(supabase: SupabaseClient, type: ListingType, f: BoardFilters) {
	let q = supabase
		.from('listings')
		.select('*')
		.eq('type', type)
		.eq('status', 'published')
		.gt('expires_at', new Date().toISOString());

	// Free-text search on title, suburb and summary (PostgREST "or" syntax — strip its special chars)
	const term = f.q.replace(/[%,()*\\.:"]/g, ' ').trim();
	if (term) q = q.or(`title.ilike.*${term}*,suburb.ilike.*${term}*,summary.ilike.*${term}*`);

	const zones = f.zone ? zonesForFilter(f.zone) : [];
	if (zones.length) q = q.in('zone', zones);

	if (type === 'job') {
		if (f.cat) q = q.eq('job_category', f.cat);
		const min = Number(f.min);
		if (f.min && Number.isFinite(min)) q = q.gte('pay_hour_equiv', min);
	}
	if (type === 'room') {
		const max = Number(f.max);
		if (f.max && Number.isFinite(max)) q = q.lte('rent_week', max);
		if (f.type) q = q.eq('room_type', f.type);
	}

	const days = Number(f.posted);
	if (f.posted && Number.isFinite(days)) {
		q = q.gte('published_at', new Date(Date.now() - days * 86400000).toISOString());
	}

	if (f.sort === 'price') {
		q = type === 'job'
			? q.order('pay_hour_equiv', { ascending: false, nullsFirst: false })
			: q.order('rent_week', { ascending: true, nullsFirst: false });
	} else if (f.sort === 'start') {
		q = q.order(type === 'job' ? 'start_date' : 'available_from', { ascending: true, nullsFirst: false });
	}
	q = q.order('published_at', { ascending: false }).limit(PAGE_SIZE);

	const { data, error: err } = await q;
	if (err) {
		console.error('loadBoard', err);
		error(503, 'The board is having a nap. Try again in a minute.');
	}
	return (data ?? []) as Listing[];
}

export async function loadListing(
	supabase: SupabaseClient,
	type: ListingType,
	idParam: string,
	canSeeContacts: boolean
) {
	const id = Number(idParam);
	if (!Number.isInteger(id) || id <= 0) error(404, 'Listing not found');

	const { data, error: err } = await supabase
		.from('listings')
		.select('*')
		.eq('id', id)
		.eq('type', type)
		.maybeSingle();
	if (err) {
		console.error('loadListing', err);
		error(503, 'Could not load this listing. Try again in a minute.');
	}
	if (!data) error(404, 'This listing is gone — it may have expired or been taken.');

	let contact: ListingPrivate | null = null;
	if (canSeeContacts) {
		const { data: priv } = await supabase
			.from('listing_private')
			.select('contact_name, contact_phone, contact_email, apply_url, original_url')
			.eq('listing_id', id)
			.maybeSingle();
		contact = priv;
	}
	return { listing: data as Listing, contact };
}

/** Zone id for a suburb/town from the admin-editable lookup table. */
export async function zoneForSuburb(supabase: SupabaseClient, suburb: string | null) {
	if (!suburb) return null;
	const { data } = await supabase
		.from('suburb_zones')
		.select('zone')
		.eq('suburb', suburb.trim().toLowerCase())
		.maybeSingle();
	return (data?.zone as string | undefined) ?? null;
}

/** Ids of the listings the user has saved (empty for visitors). */
export async function savedIds(supabase: SupabaseClient, me: App.Me | null): Promise<number[]> {
	if (!me) return [];
	const { data } = await supabase.from('saved_listings').select('listing_id').eq('user_id', me.id);
	return (data ?? []).map((r) => r.listing_id as number);
}

/** Live or recent listings that look like the same ad (anti-duplicate warning for staff). */
export async function findSimilar(
	supabase: SupabaseClient,
	l: { type: string; title?: unknown; suburb?: unknown; contact_phone?: unknown; contact_email?: unknown }
) {
	const since = new Date(Date.now() - 30 * 86400000).toISOString();
	const words = String(l.title ?? '').replace(/[%,()*\\.:"]/g, ' ').trim();
	const found = new Map<number, { id: number; title: string; suburb: string | null; status: string }>();

	if (words) {
		let q = supabase
			.from('listings')
			.select('id, title, suburb, status')
			.eq('type', l.type)
			.gte('created_at', since)
			.ilike('title', `%${words}%`);
		if (l.suburb) q = q.ilike('suburb', String(l.suburb));
		const { data } = await q.limit(3);
		for (const r of data ?? []) found.set(r.id, r);
	}
	for (const [col, value] of [['contact_phone', l.contact_phone], ['contact_email', l.contact_email]] as const) {
		if (!value) continue;
		const { data } = await supabase
			.from('listing_private')
			.select('listing_id, listings!inner(id, title, suburb, status, type, created_at)')
			.eq(col, String(value))
			.eq('listings.type', l.type)
			.gte('listings.created_at', since)
			.limit(3);
		for (const r of data ?? []) {
			const x = r.listings as unknown as { id: number; title: string; suburb: string | null; status: string };
			found.set(x.id, x);
		}
	}
	return [...found.values()].slice(0, 3);
}
