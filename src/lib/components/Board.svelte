<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { JOB_CATEGORIES, ROOM_TYPES, ZONES, ZONE_GROUPS, type ListingType } from '$lib/constants';
	import type { Listing } from '$lib/format';
	import type { BoardFilters } from '$lib/server/listings';
	import Icon from './Icon.svelte';
	import ListingCard from './ListingCard.svelte';

	let {
		type,
		listings,
		filters,
		saved = []
	}: { type: ListingType; listings: Listing[]; filters: BoardFilters; saved?: number[] } = $props();

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
	const filtered = $derived(Boolean(filters.zone || filters.q || activeCount));

	function hrefWith(key: string, value: string) {
		const u = new URL(page.url);
		if (value) u.searchParams.set(key, value);
		else u.searchParams.delete(key);
		return u.pathname + u.search;
	}

	function submit(form: HTMLFormElement) {
		const params = new URLSearchParams(page.url.search);
		for (const [k, v] of new FormData(form)) {
			if (v && !(k === 'sort' && v === 'newest')) params.set(k, String(v));
			else params.delete(k);
		}
		goto(`${page.url.pathname}${params.size ? '?' + params : ''}`, { keepFocus: true, noScroll: true });
	}

	const isJobs = $derived(type === 'job');
	const word = $derived(isJobs ? 'jobs' : 'rooms');
	const group = $derived(isJobs ? 'Jobs Board' : 'Rooms');
	const savedSet = $derived(new Set(saved));
</script>

<section class="hero">
	<div class="wrap">
		<p class="eyebrow mono"><i></i>Hand-picked by the Unplugged crew</p>
		<h1 class="page-title">{isJobs ? 'Find work' : 'Find a room'}</h1>
		<p class="count mono">{listings.length} {word} live{filtered ? ' · filtered' : ''}</p>

		<form
			class="search"
			role="search"
			onsubmit={(e) => {
				e.preventDefault();
				submit(e.currentTarget);
			}}
		>
			<label class="field-search">
				<Icon name="search" size={18} />
				<span class="sr-only">Search</span>
				<input
					name="q"
					type="search"
					value={filters.q}
					placeholder={isJobs ? 'Barista, labourer, Freo…' : 'Suburb, bills included…'}
					enterkeyhint="search"
					autocomplete="off"
				/>
			</label>
			<button type="button" class="filter-btn" onclick={() => sheet.showModal()} aria-label="Filters and sort">
				<Icon name="sliders" size={20} />
				{#if activeCount}<span class="pill">{activeCount}</span>{/if}
			</button>
		</form>
	</div>

	<div class="wrap scroller" role="navigation" aria-label="Zones">
		{#each quickZones as z}
			<a href={hrefWith('zone', z.id)} class="zone" class:on={filters.zone === z.id} data-sveltekit-noscroll
				>{z.label}</a
			>
		{/each}
	</div>
</section>

<section class="wrap list">
	{#each listings as l (l.id)}
		<ListingCard listing={l} saved={savedSet.has(l.id)} />
	{:else}
		<div class="empty">
			<div class="empty-icon"><Icon name={isJobs ? 'briefcase' : 'bed'} size={30} /></div>
			<p class="display big">Nothing here {filtered ? 'yet' : 'today'}</p>
			<p class="muted">
				No {word} {filtered ? 'match these filters' : 'on the board'} right now — check back tomorrow or ask in
				the <strong>{group}</strong> group on WhatsApp.
			</p>
			{#if filtered}
				<a class="btn" href={page.url.pathname}>Clear filters</a>
			{/if}
		</div>
	{/each}
</section>

<dialog bind:this={sheet} class="sheet" onclick={(e) => e.target === sheet && sheet.close()}>
	<form
		method="GET"
		onsubmit={(e) => {
			e.preventDefault();
			sheet.close();
			submit(e.currentTarget);
		}}
	>
		<div class="grabber"></div>
		<div class="sheet-head">
			<h2 class="display">Filters</h2>
			<button type="button" class="icon-btn" onclick={() => sheet.close()} aria-label="Close"><Icon name="x" /></button>
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
			<fieldset class="field">
				<span>Category</span>
				<div class="chips-pick">
					<label class="choice"><input type="radio" name="cat" value="" checked={!filters.cat} /><span>All</span></label>
					{#each JOB_CATEGORIES as c}
						<label class="choice"
							><input type="radio" name="cat" value={c.id} checked={filters.cat === c.id} /><span>{c.label}</span></label
						>
					{/each}
				</div>
			</fieldset>
			<label class="field">
				<span>Minimum pay (≈ $ per hour)</span>
				<input name="min" type="number" inputmode="numeric" min="0" step="1" placeholder="e.g. 30" value={filters.min} />
			</label>
		{:else}
			<label class="field">
				<span>Max rent ($ per week)</span>
				<input name="max" type="number" inputmode="numeric" min="0" step="10" placeholder="e.g. 250" value={filters.max} />
			</label>
			<fieldset class="field">
				<span>Room type</span>
				<div class="chips-pick">
					<label class="choice"><input type="radio" name="rt" value="" checked={!filters.type} /><span>Any</span></label>
					{#each ROOM_TYPES as r}
						<label class="choice"><input type="radio" name="rt" value={r.id} checked={filters.type === r.id} /><span>{r.label}</span></label>
					{/each}
				</div>
			</fieldset>
		{/if}

		<fieldset class="field">
			<span>Posted</span>
			<div class="chips-pick">
				{#each [['', 'Any time'], ['1', '24 hours'], ['3', '3 days'], ['7', '7 days']] as [v, label]}
					<label class="choice"><input type="radio" name="posted" value={v} checked={filters.posted === v} /><span>{label}</span></label>
				{/each}
			</div>
		</fieldset>

		<fieldset class="field">
			<span>Sort by</span>
			<div class="chips-pick">
				{#each [['newest', 'Newest'], ['price', isJobs ? 'Highest pay' : 'Lowest rent'], ['start', isJobs ? 'Start date' : 'Available from']] as [v, label]}
					<label class="choice"><input type="radio" name="sort" value={v} checked={(filters.sort || 'newest') === v} /><span>{label}</span></label>
				{/each}
			</div>
		</fieldset>

		<div class="sheet-actions">
			<a class="btn ghost" href={page.url.pathname} onclick={() => sheet.close()}>Reset</a>
			<button class="btn primary" type="submit">Show results</button>
		</div>
	</form>
</dialog>

<style>
	.hero {
		padding: 22px 0 0;
		background: radial-gradient(90% 120% at 100% 0%, rgba(245, 194, 122, 0.08), transparent 60%);
	}
	.eyebrow {
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 0 0 8px;
		font-size: 11.5px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--muted);
	}
	.eyebrow i {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: var(--red);
		box-shadow: 0 0 10px var(--red-glow);
	}
	.count {
		margin: 8px 0 16px;
		font-size: 13px;
		color: var(--gold);
	}
	.search {
		display: flex;
		gap: 8px;
	}
	.field-search {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 0 14px;
		border-radius: 14px;
		border: 1px solid var(--line);
		background: var(--surface);
		color: var(--muted);
	}
	.field-search:focus-within {
		border-color: var(--gold);
	}
	.field-search input {
		border: 0;
		background: transparent;
		padding: 0;
		min-height: 50px;
	}
	.field-search input:focus {
		outline: none;
	}
	.filter-btn {
		position: relative;
		display: grid;
		place-items: center;
		width: 52px;
		border-radius: 14px;
		border: 1px solid var(--line);
		background: var(--surface);
		color: var(--cream);
		cursor: pointer;
	}
	.pill {
		position: absolute;
		top: -6px;
		right: -6px;
		display: grid;
		place-items: center;
		min-width: 20px;
		height: 20px;
		border-radius: 999px;
		background: var(--gold);
		color: #1a1208;
		font: 600 11px var(--font-mono);
	}
	.scroller {
		display: flex;
		gap: 8px;
		overflow-x: auto;
		padding-top: 14px;
		padding-bottom: 14px;
		scrollbar-width: none;
	}
	.scroller::-webkit-scrollbar {
		display: none;
	}
	.zone {
		flex: none;
		padding: 8px 14px;
		border-radius: 999px;
		border: 1px solid var(--line);
		background: var(--surface);
		color: var(--cream);
		font-size: 14px;
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
		padding-top: 4px;
	}
	@media (min-width: 820px) {
		.list {
			grid-template-columns: 1fr 1fr;
		}
	}
	.empty {
		grid-column: 1 / -1;
		display: grid;
		justify-items: center;
		gap: 6px;
		text-align: center;
		padding: 40px 20px;
		border: 1px dashed var(--line);
		border-radius: var(--radius);
	}
	.empty-icon {
		display: grid;
		place-items: center;
		width: 64px;
		height: 64px;
		border-radius: 50%;
		background: var(--gold-soft);
		color: var(--gold);
		margin-bottom: 6px;
	}
	.empty .big {
		font-size: 28px;
		color: var(--cream);
		margin: 0;
	}
	.empty p {
		margin: 0 0 8px;
		max-width: 340px;
	}
	.sheet {
		width: 100%;
		max-width: var(--max);
		margin: auto auto 0;
		padding: 0;
		border: 1px solid var(--line);
		border-radius: 24px 24px 0 0;
		background: var(--surface);
		color: var(--cream);
		max-height: 90vh;
	}
	.sheet::backdrop {
		background: rgba(0, 0, 0, 0.7);
	}
	.sheet form {
		display: grid;
		gap: 20px;
		padding: 10px var(--gutter) calc(18px + env(safe-area-inset-bottom));
	}
	.grabber {
		justify-self: center;
		width: 40px;
		height: 4px;
		border-radius: 4px;
		background: var(--line);
	}
	.sheet-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.sheet-head h2 {
		margin: 0;
		font-size: 30px;
	}
	fieldset {
		border: 0;
		margin: 0;
		padding: 0;
	}
	.chips-pick {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.sheet-actions {
		position: sticky;
		bottom: 0;
		display: grid;
		grid-template-columns: 1fr 2fr;
		gap: 10px;
		padding-top: 8px;
		background: var(--surface);
	}
</style>
