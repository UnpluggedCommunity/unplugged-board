<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { JOB_CATEGORIES, ROOM_TYPES, ZONES, ZONE_GROUPS, type ListingType } from '$lib/constants';
	import type { Listing } from '$lib/format';
	import type { BoardFilters } from '$lib/server/listings';
	import ListingCard from './ListingCard.svelte';

	let {
		type,
		listings,
		filters
	}: { type: ListingType; listings: Listing[]; filters: BoardFilters } = $props();

	let sheet: HTMLDialogElement;

	const quickZones = [
		{ id: '', label: 'All' },
		{ id: 'metro', label: 'Perth Metro' },
		...ZONES.filter((z) => z.group === 'metro'),
		{ id: 'regional', label: 'Regional WA' },
		{ id: 'interstate', label: 'Other states' }
	];

	const activeCount = $derived(
		[filters.cat, filters.min, filters.max, filters.posted, filters.type].filter(Boolean).length +
			(filters.sort && filters.sort !== 'newest' ? 1 : 0)
	);

	function hrefWith(key: string, value: string) {
		const u = new URL(page.url);
		if (value) u.searchParams.set(key, value);
		else u.searchParams.delete(key);
		return u.pathname + u.search;
	}

	function apply(e: SubmitEvent) {
		e.preventDefault();
		const form = e.currentTarget as HTMLFormElement;
		const params = new URLSearchParams();
		for (const [k, v] of new FormData(form)) if (v) params.set(k, String(v));
		if (params.get('sort') === 'newest') params.delete('sort');
		sheet.close();
		goto(`${page.url.pathname}${params.size ? '?' + params : ''}`, { keepFocus: true, noScroll: true });
	}

	const isJobs = $derived(type === 'job');
	const sectionWord = $derived(isJobs ? 'jobs' : 'rooms');
	const group = $derived(isJobs ? 'Jobs Board' : 'Rooms');
</script>

<div class="zones" role="navigation" aria-label="Zones">
	<div class="wrap scroller">
		{#each quickZones as z}
			<a
				href={hrefWith('zone', z.id)}
				class="zone mono"
				class:on={filters.zone === z.id}
				data-sveltekit-noscroll>{z.label}</a
			>
		{/each}
	</div>
</div>

<section class="wrap list">
	<p class="label count">{listings.length} {sectionWord} live</p>
	{#each listings as l (l.id)}
		<ListingCard listing={l} />
	{:else}
		<div class="empty card">
			<p class="display big">Nothing here yet</p>
			<p>
				No {sectionWord} {filters.zone || activeCount ? 'match these filters' : 'on the board'} right now —
				check back tomorrow or ask in the <strong>{group}</strong> group on WhatsApp.
			</p>
			{#if filters.zone || activeCount}
				<a class="btn" href={page.url.pathname}>Clear filters</a>
			{/if}
		</div>
	{/each}
</section>

<div class="dock">
	<button class="btn primary filters-btn" type="button" onclick={() => sheet.showModal()}>
		Filters & sort{#if activeCount}<span class="count-pill">{activeCount}</span>{/if}
	</button>
</div>

<dialog bind:this={sheet} class="sheet" onclick={(e) => e.target === sheet && sheet.close()}>
	<form method="GET" onsubmit={apply}>
		<div class="sheet-head">
			<h2 class="display">Filters</h2>
			<button type="button" class="btn small ghost" onclick={() => sheet.close()}>Close</button>
		</div>

		<label class="field">
			<span>Zone</span>
			<select name="zone" value={filters.zone}>
				<option value="">Anywhere</option>
				{#each ZONE_GROUPS as g}
					<optgroup label={g.label}>
						<option value={g.id}>All {g.label}</option>
						{#each ZONES.filter((z) => z.group === g.id) as z}
							<option value={z.id}>{z.label}</option>
						{/each}
					</optgroup>
				{/each}
			</select>
		</label>

		{#if isJobs}
			<label class="field">
				<span>Category</span>
				<select name="cat" value={filters.cat}>
					<option value="">All categories</option>
					{#each JOB_CATEGORIES as c}<option value={c.id}>{c.emoji} {c.label}</option>{/each}
				</select>
			</label>
			<label class="field">
				<span>Minimum pay (≈ $ per hour)</span>
				<input name="min" type="number" inputmode="numeric" min="0" step="1" placeholder="e.g. 30" value={filters.min} />
			</label>
		{:else}
			<label class="field">
				<span>Max rent ($ per week)</span>
				<input name="max" type="number" inputmode="numeric" min="0" step="10" placeholder="e.g. 250" value={filters.max} />
			</label>
			<label class="field">
				<span>Room type</span>
				<select name="rt" value={filters.type}>
					<option value="">Any</option>
					{#each ROOM_TYPES as r}<option value={r.id}>{r.label}</option>{/each}
				</select>
			</label>
		{/if}

		<label class="field">
			<span>Posted</span>
			<select name="posted" value={filters.posted}>
				<option value="">Any time</option>
				<option value="1">Last 24 hours</option>
				<option value="3">Last 3 days</option>
				<option value="7">Last 7 days</option>
			</select>
		</label>

		<label class="field">
			<span>Sort by</span>
			<select name="sort" value={filters.sort}>
				<option value="newest">Newest</option>
				<option value="price">{isJobs ? 'Highest pay' : 'Lowest rent'}</option>
				<option value="start">{isJobs ? 'Start date' : 'Available from'}</option>
			</select>
		</label>

		<div class="sheet-actions">
			<a class="btn ghost" href={page.url.pathname} onclick={() => sheet.close()}>Reset</a>
			<button class="btn primary" type="submit">Show results</button>
		</div>
	</form>
</dialog>

<style>
	.zones {
		position: sticky;
		top: 0;
		z-index: 5;
		background: rgba(10, 10, 10, 0.92);
		backdrop-filter: blur(8px);
		border-bottom: 1px solid var(--line);
	}
	.scroller {
		display: flex;
		gap: 8px;
		overflow-x: auto;
		padding-top: 10px;
		padding-bottom: 10px;
		scrollbar-width: none;
	}
	.scroller::-webkit-scrollbar {
		display: none;
	}
	.zone {
		flex: none;
		padding: 7px 12px;
		border-radius: 999px;
		border: 1px solid var(--line);
		color: var(--cream);
		font-size: 13px;
		text-decoration: none;
		white-space: nowrap;
	}
	.zone.on {
		background: var(--gold);
		border-color: var(--gold);
		color: #1a1208;
		font-weight: 600;
	}
	.list {
		display: grid;
		gap: 12px;
		padding-top: 14px;
		padding-bottom: 96px;
	}
	.count {
		margin: 0;
	}
	.empty {
		text-align: center;
		padding: 32px 20px;
	}
	.empty .big {
		font-size: 28px;
		color: var(--gold);
		margin: 0 0 8px;
	}
	.dock {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 10;
		display: flex;
		justify-content: center;
		padding: 12px var(--gutter) calc(12px + env(safe-area-inset-bottom));
		pointer-events: none;
	}
	.filters-btn {
		pointer-events: auto;
		box-shadow: 0 8px 28px rgba(0, 0, 0, 0.6);
	}
	.count-pill {
		display: inline-grid;
		place-items: center;
		min-width: 22px;
		height: 22px;
		border-radius: 999px;
		background: #1a1208;
		color: var(--gold);
		font: 600 12px var(--font-mono);
	}
	.sheet {
		width: 100%;
		max-width: var(--max);
		margin: auto auto 0;
		padding: 0;
		border: 1px solid var(--line);
		border-radius: 20px 20px 0 0;
		background: var(--surface);
		color: var(--cream);
		max-height: 88vh;
	}
	.sheet::backdrop {
		background: rgba(0, 0, 0, 0.65);
	}
	.sheet form {
		display: grid;
		gap: 16px;
		padding: 18px var(--gutter) calc(18px + env(safe-area-inset-bottom));
	}
	.sheet-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.sheet-head h2 {
		margin: 0;
		font-size: 26px;
	}
	.sheet-actions {
		display: grid;
		grid-template-columns: 1fr 2fr;
		gap: 10px;
	}
</style>
