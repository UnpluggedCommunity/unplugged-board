<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import ListingForm from '$lib/components/ListingForm.svelte';
	import { jobCategory, type ListingType } from '$lib/constants';
	import { buildParts, prepareForAi } from '$lib/extract-client';
	import { toFormValues } from '$lib/fields';
	import { formatPrice, place } from '$lib/format';
	import { compressImage } from '$lib/image';
	import { createListing, listingFromValues } from '$lib/publish-client';

	let { data, form } = $props();

	const MAX = 24;
	type Similar = { id: number; title: string; suburb: string | null; status: string };
	type Found = {
		type: ListingType;
		listing: Record<string, unknown>;
		uncertain: string[];
		warnings: string[];
		screenshots: number[];
		photos: number[];
		similar: Similar[];
	};
	type Item = Found & {
		action: 'publish' | 'draft' | 'skip';
		editing?: boolean;
		result?: { ok: boolean; text: string; path?: string };
	};

	// Upload state
	let files = $state<File[]>([]);
	let aiImages = $state<Blob[]>([]);
	let previews = $state<string[]>([]);
	let hint = $state<'auto' | ListingType>('auto');
	let preparing = $state(false);
	let reading = $state(false);
	let error = $state<string | null>(null);
	let input = $state<HTMLInputElement>();

	// Results
	let items = $state<Item[] | null>(null);
	let unused = $state<number[]>([]);
	let creating = $state(false);
	let progress = $state('');

	// Single listing / manual form
	// svelte-ignore state_referenced_locally — the page owns the type after load
	let type = $state<ListingType>(data.type);
	let prefill = $state<Found | null>(null);
	let presetPhotos = $state<File[]>([]);
	let formKey = $state(0);
	const initial = $derived(toFormValues(type, {}));

	async function addFiles() {
		const picked = [...(input?.files ?? [])].slice(0, MAX - files.length);
		if (input) input.value = '';
		if (!picked.length) return;
		preparing = true;
		const ready = await Promise.all(picked.map(prepareForAi));
		files = [...files, ...picked];
		aiImages = [...aiImages, ...ready];
		previews = [...previews, ...ready.map((b) => URL.createObjectURL(b))];
		preparing = false;
	}

	function removeAt(i: number) {
		URL.revokeObjectURL(previews[i]);
		files = files.filter((_, j) => j !== i);
		aiImages = aiImages.filter((_, j) => j !== i);
		previews = previews.filter((_, j) => j !== i);
	}

	function reset() {
		previews.forEach((u) => URL.revokeObjectURL(u));
		files = [];
		aiImages = [];
		previews = [];
		items = null;
		prefill = null;
		presetPhotos = [];
		formKey++;
		unused = [];
		error = null;
	}

	async function read() {
		reading = true;
		error = null;
		try {
			const body = await buildParts(aiImages);
			const qs = new URLSearchParams({ count: String(aiImages.length) });
			if (hint !== 'auto') qs.set('hint', hint);
			const res = await fetch(`/staff/extract?${qs}`, { method: 'POST', body, headers: { 'content-type': 'application/json' } });
			const out = await res.json().catch(() => ({ ok: false, message: res.statusText }));
			if (!res.ok || !out.ok) {
				error = out.message ?? `Error ${res.status}`;
			} else if (!out.listings.length) {
				error = "The AI didn't find any job or room in these images.";
			} else if (out.listings.length === 1) {
				openInForm(out.listings[0]);
			} else {
				items = (out.listings as Found[]).map((l) => ({
					...l,
					action: l.warnings.length || l.similar.length ? 'draft' : 'publish'
				}));
				unused = out.unused;
			}
		} catch {
			error = 'Connection problem. Try again.';
		}
		reading = false;
	}

	function openInForm(found: Found) {
		type = found.type;
		prefill = found;
		presetPhotos = found.photos.map((n) => files[n - 1]).filter(Boolean);
		formKey++;
		setTimeout(() => document.getElementById('review')?.scrollIntoView({ behavior: 'smooth' }), 50);
	}

	async function createAll() {
		if (!items) return;
		creating = true;
		const todo = items.filter((i) => i.action !== 'skip');
		let n = 0;
		for (const item of todo) {
			progress = `Saving ${++n} of ${todo.length}…`;
			const values = { ...toFormValues(item.type, {}), ...nonEmpty(toFormValues(item.type, item.listing)) };
			const photos = await Promise.all(
				item.photos
					.map((p) => files[p - 1])
					.filter(Boolean)
					.map((f) => compressImage(f, { maxSide: 1200, type: 'image/webp', quality: 0.8 }))
			);
			const r = await createListing(item.type, values, photos, item.action as 'publish' | 'draft');
			item.result = r.ok
				? { ok: true, text: item.action === 'publish' ? 'Published' : 'Saved as draft', path: r.path }
				: { ok: false, text: r.message };
		}
		progress = '';
		creating = false;
	}

	const nonEmpty = (v: Record<string, string>) => Object.fromEntries(Object.entries(v).filter(([, x]) => x !== ''));
	const summary = (f: Found) => {
		const l = listingFromValues(f.type, { ...toFormValues(f.type, f.listing) }, 0);
		return [f.type === 'job' ? jobCategory(l.job_category)?.label : 'Room', formatPrice(l), place(l)].filter(Boolean).join(' · ');
	};
	const counts = $derived(
		items
			? {
					publish: items.filter((i) => i.action === 'publish').length,
					draft: items.filter((i) => i.action === 'draft').length
				}
			: { publish: 0, draft: 0 }
	);
	const done = $derived(Boolean(items?.some((i) => i.result)));

	function switchType(t: ListingType) {
		if (t === type) return;
		type = t;
		prefill = null;
		presetPhotos = [];
		formKey++;
	}
</script>

<svelte:head><title>New listing · Staff</title></svelte:head>

<section class="wrap page">
	<a class="mono back" href="/staff"><Icon name="back" size={16} />Staff</a>
	<h1 class="page-title">New listings</h1>

	<!-- Quick Add -->
	<div class="quick card">
		<h2 class="section-label"><Icon name="sparkles" size={15} />Quick Add with AI</h2>
		<p class="muted small">
			Add <strong>screenshots</strong> of Facebook posts, employers' <strong>flyers</strong> and real
			<strong>photos</strong> of rooms — up to {MAX} at once, even for many different listings. Add them
			<strong>in order</strong>: a post's screenshots, then its photos, then the next post. The AI makes one card per
			listing and attaches the photos to the right room. Screenshots are never saved.
		</p>

		<div class="chips-pick">
			{#each [['auto', 'Jobs & rooms'], ['job', 'Only jobs'], ['room', 'Only rooms']] as [v, label]}
				<label class="choice"><input type="radio" bind:group={hint} value={v} /><span>{label}</span></label>
			{/each}
		</div>

		{#if previews.length}
			<div class="grid-shots">
				{#each previews as src, i (src)}
					<figure class:unused={unused.includes(i + 1)}>
						<img {src} alt="Image {i + 1}" />
						<span class="num mono">{i + 1}</span>
						{#if !items}<button type="button" class="x" aria-label="Remove image {i + 1}" onclick={() => removeAt(i)}><Icon name="x" size={14} /></button>{/if}
					</figure>
				{/each}
			</div>
		{/if}

		{#if !items}
			{#if files.length < MAX}
				<label class="drop">
					<input bind:this={input} type="file" accept="image/*" multiple onchange={addFiles} />
					<Icon name="upload" size={24} />
					<span>{preparing ? 'Preparing…' : files.length ? `${files.length}/${MAX} — tap to add more` : 'Tap to choose images from your gallery'}</span>
				</label>
			{/if}
			<div class="row">
				{#if files.length}<button type="button" class="btn ghost" onclick={reset}>Clear</button>{/if}
				<button type="button" class="btn primary grow" onclick={read} disabled={!files.length || reading || preparing || !data.aiReady}>
					<Icon name="sparkles" size={18} />{reading ? `Reading ${files.length} image(s)… up to a minute` : `Read ${files.length || ''} with AI`}
				</button>
			</div>
			{#if !data.aiReady}<p class="notice">The AI is off (no GEMINI_API_KEY). Use the form below.</p>{/if}
		{/if}
		{#if error}<p class="notice error">{error}</p>{/if}
	</div>

	<!-- Batch results -->
	{#if items}
		<div class="results">
			<h2 class="section-label">Found {items.length} listings</h2>
			<p class="muted small">
				Check each card. Listings with warnings or a possible duplicate are set to <strong>Draft</strong>: you can
				edit them later from Staff → Drafts.
			</p>

			{#each items as item, i}
				<article class="found card" class:skipped={item.action === 'skip'}>
					<div class="found-head">
						<span class="badge" class:gold={item.type === 'job'}>{item.type}</span>
						<span class="mono imgs">images {[...item.screenshots, ...item.photos].sort((a, b) => a - b).join(', ')}</span>
					</div>
					<h3>{String(item.listing.title ?? 'Untitled')}</h3>
					<p class="muted small">{summary(item)}</p>

					{#if item.photos.length}
						<div class="thumbs">
							{#each item.photos as n}<img src={previews[n - 1]} alt="Photo {n}" />{/each}
						</div>
					{/if}
					{#if item.warnings.length}
						<ul class="warn">{#each item.warnings as w}<li>⚠️ {w}</li>{/each}</ul>
					{/if}
					{#if item.similar.length}
						<p class="dup">
							Possible duplicate of
							{#each item.similar as s, k}{k ? ', ' : ''}<a href="/{item.type === 'job' ? 'j' : 'r'}/{s.id}" target="_blank">{s.title}</a>{/each}
						</p>
					{/if}
					{#if item.uncertain.length}<p class="muted tiny">Check: {item.uncertain.join(', ')}</p>{/if}

					{#if item.result}
						<p class="notice" class:ok={item.result.ok} class:error={!item.result.ok}>
							{item.result.text}
							{#if item.result.path}· <a href={item.result.path} target="_blank">open</a>{/if}
						</p>
					{:else}
						<div class="seg" role="radiogroup" aria-label="What to do with listing {i + 1}">
							{#each [['publish', 'Publish'], ['draft', 'Draft'], ['skip', 'Skip']] as [v, label]}
								<label class="choice"><input type="radio" bind:group={item.action} value={v} disabled={creating} /><span>{label}</span></label>
							{/each}
							<button
								type="button"
								class="btn small ghost"
								disabled={creating}
								onclick={() => {
									items?.forEach((x) => (x.editing = false));
									item.action = 'skip';
									item.editing = true;
									openInForm(item);
								}}>Edit now</button
							>
						</div>
						{#if item.editing}<p class="muted tiny">Editing in the form below — publish it from there.</p>{/if}
					{/if}
				</article>
			{/each}

			{#if unused.length}
				<p class="muted small">Not used: images {unused.join(', ')} (unreadable, unrelated, or photos the AI couldn't match).</p>
			{/if}

			<div class="sticky-actions">
				{#if done && !creating}
					<a class="btn" href="/staff?view=draft">Go to drafts</a>
					<button type="button" class="btn primary grow" onclick={reset}>Add more</button>
				{:else}
					<button type="button" class="btn ghost" onclick={reset} disabled={creating}>Start over</button>
					<button type="button" class="btn primary grow" onclick={createAll} disabled={creating || counts.publish + counts.draft === 0}>
						{creating ? progress : `Publish ${counts.publish}${counts.draft ? ` · draft ${counts.draft}` : ''}`}
					</button>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Single listing form (hidden while reviewing a batch, unless a card is being edited) -->
	{#if !items || prefill}
	<div id="review" class="review-head">
		<h2 class="section-label">{prefill ? 'Check and publish' : 'Or fill in by hand'}</h2>
		<nav class="types mono">
			<button type="button" class:on={type === 'job'} onclick={() => switchType('job')}>Job</button>
			<button type="button" class:on={type === 'room'} onclick={() => switchType('room')}>Room</button>
		</nav>
	</div>

	{#if prefill}
		<p class="notice ok">
			Filled in by AI as a <strong>{type}</strong>. Fields marked <span class="check">· check</span> were unclear —
			anything not in the post is left empty.
		</p>
		{#if prefill.similar.length}
			<div class="notice error">
				<strong>Possible duplicate</strong> — similar listing in the last 30 days:
				{#each prefill.similar as s, k}{k ? ', ' : ''}<a href="/{type === 'job' ? 'j' : 'r'}/{s.id}" target="_blank">{s.title}</a>{/each}
			</div>
		{/if}
	{/if}

	{#key formKey}
		<ListingForm {type} {initial} {prefill} {presetPhotos} message={form && 'message' in form ? (form.message as string) : null} />
	{/key}
	{/if}
</section>

<style>
	.page {
		padding-top: 16px;
		display: grid;
		gap: 14px;
	}
	.back {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: 13px;
		color: var(--muted);
		text-decoration: none;
	}
	.quick {
		display: grid;
		gap: 12px;
		border-color: #4a3b26;
		background: linear-gradient(160deg, rgba(245, 194, 122, 0.08), transparent 60%), var(--surface);
	}
	.quick h2,
	.results h2 {
		margin: 0;
	}
	.small {
		font-size: 14px;
		margin: 0;
	}
	.tiny {
		font-size: 12px;
		margin: 0;
	}
	.chips-pick,
	.seg {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		align-items: center;
	}
	.grid-shots {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
		gap: 8px;
	}
	figure {
		position: relative;
		margin: 0;
	}
	figure img {
		width: 100%;
		aspect-ratio: 3 / 4;
		object-fit: cover;
		border-radius: 10px;
		border: 1px solid var(--line);
	}
	figure.unused img {
		opacity: 0.35;
	}
	.num {
		position: absolute;
		left: 6px;
		top: 6px;
		min-width: 22px;
		padding: 0 6px;
		border-radius: 999px;
		background: rgba(0, 0, 0, 0.75);
		color: var(--gold);
		font-size: 12px;
		text-align: center;
	}
	.x {
		position: absolute;
		right: 4px;
		top: 4px;
		display: grid;
		place-items: center;
		width: 26px;
		height: 26px;
		border-radius: 50%;
		border: 0;
		background: rgba(0, 0, 0, 0.75);
		color: var(--cream);
		cursor: pointer;
	}
	.drop {
		position: relative;
		display: grid;
		justify-items: center;
		gap: 6px;
		padding: 22px 12px;
		border-radius: 14px;
		border: 1.5px dashed #4a3b26;
		background: var(--gold-soft);
		color: var(--gold);
		text-align: center;
		cursor: pointer;
	}
	.drop span {
		color: var(--cream);
		font-size: 14px;
	}
	.drop input {
		position: absolute;
		inset: 0;
		opacity: 0;
		cursor: pointer;
	}
	.row,
	.sticky-actions {
		display: flex;
		gap: 10px;
	}
	.grow {
		flex: 1;
	}
	.results {
		display: grid;
		gap: 12px;
	}
	.found {
		display: grid;
		gap: 8px;
	}
	.found.skipped {
		opacity: 0.5;
	}
	.found h3 {
		margin: 0;
		font-size: 18px;
	}
	.found-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.imgs {
		font-size: 11px;
		color: var(--muted);
	}
	.thumbs {
		display: flex;
		gap: 6px;
		overflow-x: auto;
	}
	.thumbs img {
		width: 72px;
		height: 72px;
		object-fit: cover;
		border-radius: 8px;
		flex: none;
	}
	.warn {
		margin: 0;
		padding: 8px 12px;
		list-style: none;
		border-radius: 10px;
		background: #1d0c10;
		border: 1px solid #6b2230;
		font-size: 13px;
	}
	.dup {
		margin: 0;
		font-size: 13px;
		color: #ff8a9b;
	}
	.sticky-actions {
		position: sticky;
		bottom: calc(var(--nav-h) + env(safe-area-inset-bottom));
		padding: 12px 0;
		background: linear-gradient(transparent, var(--bg) 30%);
		z-index: 5;
	}
	.review-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 8px;
		scroll-margin-top: 16px;
	}
	.review-head h2 {
		margin: 0;
	}
	.types {
		display: flex;
		gap: 6px;
	}
	.types button {
		padding: 6px 14px;
		border-radius: 999px;
		border: 1px solid var(--line);
		background: none;
		color: var(--cream);
		font: inherit;
		cursor: pointer;
	}
	.types button.on {
		background: var(--gold);
		color: #1a1208;
		border-color: var(--gold);
	}
	.check {
		color: var(--orange);
	}
</style>
