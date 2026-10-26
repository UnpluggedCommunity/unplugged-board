<script lang="ts">
	import { deserialize } from '$app/forms';
	import Icon from '$lib/components/Icon.svelte';
	import ListingForm from '$lib/components/ListingForm.svelte';
	import type { ListingType } from '$lib/constants';
	import { toFormValues } from '$lib/fields';
	import { compressImage } from '$lib/image';

	let { data, form } = $props();

	type Extraction = { type: ListingType; listing: Record<string, unknown>; uncertain: string[]; warnings: string[] };
	type Similar = { id: number; title: string; suburb: string | null; status: string };

	// svelte-ignore state_referenced_locally — the page owns the type after load
	let type = $state<ListingType>(data.type);
	let hint = $state<'auto' | ListingType>('auto');
	let shots = $state<File[]>([]);
	let previews = $state<string[]>([]);
	let reading = $state(false);
	let error = $state<string | null>(null);
	let prefill = $state<Extraction | null>(null);
	let similar = $state<Similar[]>([]);
	let formKey = $state(0);
	let shotInput: HTMLInputElement;

	const initial = $derived(toFormValues(type, {}));

	async function addShots() {
		const files = [...(shotInput.files ?? [])];
		const ready = await Promise.all(
			files.map((f) => compressImage(f, { maxSide: 1600, type: 'image/jpeg', quality: 0.85 }))
		);
		shots = [...shots, ...ready].slice(0, 6);
		previews.forEach((u) => URL.revokeObjectURL(u));
		previews = shots.map((f) => URL.createObjectURL(f));
		shotInput.value = '';
	}

	function clearShots() {
		previews.forEach((u) => URL.revokeObjectURL(u));
		shots = [];
		previews = [];
	}

	async function read() {
		if (!shots.length) return;
		reading = true;
		error = null;
		const fd = new FormData();
		shots.forEach((f) => fd.append('shots', f));
		if (hint !== 'auto') fd.set('hint', hint);
		try {
			const res = await fetch('?/extract', {
				method: 'POST',
				body: fd,
				headers: { accept: 'application/json', 'x-sveltekit-action': 'true' }
			});
			const result = deserialize(await res.text());
			if (result.type === 'success' && result.data?.extraction) {
				const ex = result.data.extraction as Extraction;
				type = ex.type;
				prefill = ex;
				similar = (result.data.similar as Similar[]) ?? [];
				formKey++;
				clearShots();
				setTimeout(() => document.getElementById('review')?.scrollIntoView({ behavior: 'smooth' }), 50);
			} else if (result.type === 'failure') {
				error = (result.data?.extractError as string) ?? 'Something went wrong.';
			} else {
				error = 'Something went wrong.';
			}
		} catch {
			error = 'Connection problem. Try again.';
		}
		reading = false;
	}

	function switchType(t: ListingType) {
		if (t === type) return;
		type = t;
		prefill = null;
		similar = [];
		formKey++;
	}
</script>

<svelte:head><title>New listing · Staff</title></svelte:head>

<section class="wrap page">
	<a class="mono back" href="/staff"><Icon name="back" size={16} />Staff</a>
	<h1 class="page-title">New listing</h1>

	<!-- Quick Add -->
	<div class="quick card">
		<h2 class="section-label"><Icon name="sparkles" size={15} />Quick Add from screenshots</h2>
		<p class="muted small">
			Screenshots of a Facebook post (long posts: several screenshots) or the employer's flyer. The AI fills
			in the form, you check it and publish. Screenshots are not saved.
		</p>

		<div class="chips-pick">
			{#each [['auto', 'Auto-detect'], ['job', 'Job'], ['room', 'Room']] as [v, label]}
				<label class="choice"><input type="radio" bind:group={hint} value={v} /><span>{label}</span></label>
			{/each}
		</div>

		<label class="drop" class:has={shots.length}>
			<input bind:this={shotInput} type="file" accept="image/*" multiple onchange={addShots} />
			<Icon name="upload" size={26} />
			<span>{shots.length ? `${shots.length} image(s) — tap to add more` : 'Tap to add screenshots or a flyer (max 6)'}</span>
		</label>

		{#if previews.length}
			<div class="thumbs">
				{#each previews as src, i}<img {src} alt="Screenshot {i + 1}" />{/each}
			</div>
		{/if}

		<div class="row">
			{#if shots.length}<button type="button" class="btn ghost" onclick={clearShots}>Clear</button>{/if}
			<button type="button" class="btn primary grow" onclick={read} disabled={!shots.length || reading || !data.aiReady}>
				<Icon name="sparkles" size={18} />{reading ? 'Reading… (about 10 seconds)' : 'Read with AI'}
			</button>
		</div>
		{#if !data.aiReady}<p class="notice">The AI is off (no GEMINI_API_KEY). Use the form or Paste JSON below.</p>{/if}
		{#if error}<p class="notice error">{error}</p>{/if}
	</div>

	<!-- Review -->
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
	{/if}
	{#if similar.length}
		<div class="notice error">
			<strong>Possible duplicate</strong> — a similar listing was added in the last 30 days:
			<ul>
				{#each similar as s}
					<li><a href="/{type === 'job' ? 'j' : 'r'}/{s.id}" target="_blank">{s.title}{s.suburb ? ` · ${s.suburb}` : ''}</a> ({s.status})</li>
				{/each}
			</ul>
		</div>
	{/if}

	{#key formKey}
		<ListingForm {type} {initial} {prefill} message={form && 'message' in form ? (form.message as string) : null} />
	{/key}
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
	.quick h2 {
		margin: 0;
	}
	.small {
		font-size: 14px;
		margin: 0;
	}
	.chips-pick {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.drop {
		position: relative;
		display: grid;
		justify-items: center;
		gap: 8px;
		padding: 26px 12px;
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
	.thumbs {
		display: flex;
		gap: 8px;
		overflow-x: auto;
	}
	.thumbs img {
		height: 120px;
		border-radius: 10px;
		flex: none;
	}
	.row {
		display: flex;
		gap: 10px;
	}
	.grow {
		flex: 1;
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
	ul {
		margin: 6px 0 0;
		padding-left: 18px;
	}
</style>
