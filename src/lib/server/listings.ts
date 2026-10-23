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
		sort: p.get('sort') ?? 'newest'
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
