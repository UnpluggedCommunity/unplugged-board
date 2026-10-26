<script lang="ts">
	import { enhance } from '$app/forms';
	import { LIFETIME_DAYS, type ListingType } from '$lib/constants';
	import { fieldsFor, toFormValues, type FormValues } from '$lib/fields';
	import { compressImage } from '$lib/image';
	import { listingFromValues, uploadShareCard } from '$lib/publish-client';
	import { onMount } from 'svelte';

	type Prefill = { listing: Record<string, unknown>; uncertain?: string[]; warnings?: string[] };

	let {
		type,
		initial,
		message = null,
		editing = false,
		prefill = null,
		photos = [],
		presetPhotos = []
	}: {
		type: ListingType;
		initial: FormValues;
		message?: string | null;
		editing?: boolean;
		prefill?: Prefill | null;
		photos?: string[];
		/** Photos the AI matched to this listing (Quick Add): pre-selected for upload. */
		presetPhotos?: File[];
	} = $props();

	// svelte-ignore state_referenced_locally — the form owns its values after the first render
	let values = $state<FormValues>({ ...initial });
	let uncertain = $state<string[]>([]);
	let warnings = $state<string[]>([]);
	let previews = $state<string[]>([]);
	let preparing = $state(false);
	let removePhotos = $state(false);
	let photoInput: HTMLInputElement;

	/** Merge AI / pasted data into the form (only non-empty values). */
	function applyData(parsed: Prefill) {
		values = {
			...values,
			...Object.fromEntries(Object.entries(toFormValues(type, parsed.listing)).filter(([, v]) => v !== ''))
		};
		uncertain = Array.isArray(parsed.uncertain) ? parsed.uncertain : [];
		warnings = Array.isArray(parsed.warnings) ? parsed.warnings : [];
	}
	// svelte-ignore state_referenced_locally — applied once when the form is created
	if (prefill) applyData(prefill);

	onMount(() => {
		if (presetPhotos.length) preparePhotos(presetPhotos);
	});

	/** Resize photos in the browser (WebP, max 1200px) before they're uploaded. */
	async function preparePhotos(given?: File[]) {
		const files = (given ?? [...(photoInput.files ?? [])]).slice(0, 6);
		if (!files.length) return;
		preparing = true;
		const done = await Promise.all(files.map((f) => compressImage(f, { maxSide: 1200, type: 'image/webp', quality: 0.8 })));
		const dt = new DataTransfer();
		done.forEach((f) => dt.items.add(f));
		photoInput.files = dt.files;
		previews.forEach((u) => URL.revokeObjectURL(u));
		previews = done.map((f) => URL.createObjectURL(f));
		preparing = false;
	}
	let jsonText = $state('');
	let jsonMessage = $state<{ ok: boolean; text: string } | null>(null);
	let saving = $state(false);

	const fields = $derived(fieldsFor(type));
	const publicFields = $derived(fields.filter((f) => !f.private));
	const privateFields = $derived(fields.filter((f) => f.private));

	const expiry = $derived.by(() => {
		const base = values.posted_at ? new Date(values.posted_at + 'T08:00:00+08:00') : new Date();
		return new Date(base.getTime() + LIFETIME_DAYS[type] * 86400000);
	});
	const alreadyExpired = $derived(expiry.getTime() < Date.now());

	function importJson() {
		try {
			const text = jsonText.trim().replace(/^```(?:json)?\s*|\s*```$/g, '');
			const parsed = JSON.parse(text);
			const kind = parsed.type ?? parsed.listing?.type;
			if (kind && kind !== type) {
				jsonMessage = { ok: false, text: `This JSON is for a "${kind}" listing — switch type first.` };
				return;
			}
			applyData({ listing: parsed.listing ?? parsed, uncertain: parsed.uncertain, warnings: parsed.warnings });
			jsonMessage = { ok: true, text: 'Filled in — check the highlighted fields.' };
		} catch {
			jsonMessage = { ok: false, text: "That doesn't look like valid JSON." };
		}
	}

	const isEmpty = (name: string) => !values[name];
</script>

{#if warnings.length}
	<div class="notice error warn">
		<strong>⚠️ Check before publishing</strong>
		<ul>{#each warnings as w}<li>{w}</li>{/each}</ul>
	</div>
{/if}

<details class="card paste" open={!editing && !prefill}>
	<summary class="mono">Paste JSON (from Claude or another AI)</summary>
	<textarea bind:value={jsonText} placeholder={'{ "type": "' + type + '", "listing": { … } }'} rows="5"></textarea>
	<button type="button" class="btn small" onclick={importJson} disabled={!jsonText.trim()}>Fill the form</button>
	{#if jsonMessage}<p class="notice" class:error={!jsonMessage.ok} class:ok={jsonMessage.ok}>{jsonMessage.text}</p>{/if}
</details>

<form
	method="POST"
	action="?/save"
	enctype="multipart/form-data"
	use:enhance={({ formData }) => {
		saving = true;
		const publishing = formData.get('intent') !== 'draft';
		return async ({ result, update }) => {
			// Published: draw the WhatsApp share card before leaving the page.
			if (result.type === 'redirect' && publishing) {
				const id = Number(result.location.split('/').pop());
				if (id) await uploadShareCard(listingFromValues(type, values, id));
			}
			await update({ reset: false });
			saving = false;
		};
	}}
>
	<div class="grid">
		{#each publicFields as f (f.name)}
			{@render field(f)}
		{/each}
	</div>

	<input type="hidden" name="listing_type" value={type} />

	<h3 class="label section">Photos {type === 'job' ? '(optional)' : ''}</h3>
	{#if photos.length && !removePhotos}
		<div class="thumbs">
			{#each photos as src}<img {src} alt="" />{/each}
		</div>
	{/if}
	{#if photos.length}
		<label class="remove"><input type="checkbox" name="remove_photos" value="yes" bind:checked={removePhotos} /> Remove current photos</label>
	{/if}
	<label class="drop">
		<input
			bind:this={photoInput}
			type="file"
			name="photos"
			accept="image/*"
			multiple
			onchange={() => preparePhotos()}
		/>
		<span>{preparing ? 'Preparing photos…' : previews.length ? `${previews.length} photo(s) ready — tap to change` : 'Add photos of the room / item (not screenshots), max 6'}</span>
	</label>
	{#if previews.length}
		<div class="thumbs">{#each previews as src}<img {src} alt="" />{/each}</div>
	{/if}

	<h3 class="label section">Contact · members only</h3>
	<div class="grid">
		{#each privateFields as f (f.name)}
			{@render field(f)}
		{/each}
	</div>

	<p class="notice" class:error={alreadyExpired}>
		{#if alreadyExpired}
			⚠️ With this post date the listing is already expired ({LIFETIME_DAYS[type]} days). Clear the date or pick a newer post.
		{:else}
			Expires on {expiry.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })} ({LIFETIME_DAYS[type]} days from the post date).
		{/if}
	</p>

	{#if message}<p class="notice error">{message}</p>{/if}

	<div class="actions">
		{#if !editing}<button class="btn" type="submit" name="intent" value="draft" disabled={saving}>Save draft</button>{/if}
		<button class="btn primary" type="submit" name="intent" value={editing ? '' : 'publish'} disabled={saving || preparing}>
			{saving ? 'Saving…' : editing ? 'Save changes' : 'Publish'}
		</button>
	</div>
</form>

{#snippet field(f: (typeof fields)[number])}
	<label class="field" class:wide={f.wide || f.kind === 'textarea'} class:uncertain={uncertain.includes(f.name)}>
		<span>{f.label}{f.required ? ' *' : ''}{uncertain.includes(f.name) ? ' · check' : ''}</span>
		{#if f.kind === 'textarea'}
			<textarea name={f.name} bind:value={values[f.name]} placeholder="Not specified"></textarea>
		{:else if f.kind === 'select'}
			<select name={f.name} bind:value={values[f.name]} class:empty={isEmpty(f.name)}>
				<option value="">Not specified</option>
				{#each f.options ?? [] as o}<option value={o.id}>{o.label}</option>{/each}
			</select>
		{:else if f.kind === 'bool'}
			<select name={f.name} bind:value={values[f.name]} class:empty={isEmpty(f.name)}>
				<option value="">Not specified</option>
				<option value="yes">Yes</option>
				<option value="no">No</option>
			</select>
		{:else if f.kind === 'number'}
			<input name={f.name} type="text" inputmode="decimal" bind:value={values[f.name]} placeholder="Not specified" />
		{:else if f.kind === 'date'}
			<input name={f.name} type="date" bind:value={values[f.name]} />
		{:else}
			<input name={f.name} type="text" bind:value={values[f.name]} placeholder="Not specified" required={f.required} />
		{/if}
		{#if f.hint}<small class="muted">{f.hint}</small>{/if}
	</label>
{/snippet}

<style>
	.warn {
		margin-bottom: 16px;
	}
	.warn ul {
		margin: 6px 0 0;
		padding-left: 18px;
	}
	.thumbs {
		display: flex;
		gap: 8px;
		overflow-x: auto;
	}
	.thumbs img {
		width: 84px;
		height: 84px;
		object-fit: cover;
		border-radius: 10px;
		flex: none;
	}
	.remove {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 14px;
	}
	.drop {
		position: relative;
		display: grid;
		place-items: center;
		padding: 18px 12px;
		border-radius: 14px;
		border: 1.5px dashed var(--line);
		color: var(--muted);
		font-size: 14px;
		text-align: center;
		cursor: pointer;
	}
	.drop input {
		position: absolute;
		inset: 0;
		opacity: 0;
		cursor: pointer;
	}
	.paste {
		display: grid;
		gap: 10px;
		margin-bottom: 16px;
	}
	.paste summary {
		cursor: pointer;
		font-size: 14px;
		color: var(--gold);
	}
	.paste[open] summary {
		margin-bottom: 10px;
	}
	.paste textarea {
		font-family: var(--font-mono);
		font-size: 13px;
		margin-bottom: 10px;
	}
	form {
		display: grid;
		gap: 16px;
	}
	.grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 14px 12px;
	}
	.wide {
		grid-column: 1 / -1;
	}
	@media (max-width: 480px) {
		.grid {
			grid-template-columns: 1fr;
		}
	}
	.section {
		margin: 8px 0 0;
		color: var(--gold);
	}
	.uncertain input,
	.uncertain select,
	.uncertain textarea {
		border-color: var(--orange);
		box-shadow: 0 0 0 1px var(--orange);
	}
	.uncertain > span {
		color: var(--orange);
	}
	select.empty {
		color: var(--muted);
	}
	small {
		font-size: 12px;
	}
	.actions {
		position: sticky;
		bottom: 0;
		display: flex;
		justify-content: flex-end;
		gap: 10px;
		padding: 12px 0 calc(12px + env(safe-area-inset-bottom));
		background: linear-gradient(transparent, var(--bg) 30%);
	}
</style>
