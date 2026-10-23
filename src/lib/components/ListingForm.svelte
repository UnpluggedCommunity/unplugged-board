<script lang="ts">
	import { enhance } from '$app/forms';
	import { LIFETIME_DAYS, type ListingType } from '$lib/constants';
	import { fieldsFor, toFormValues, type FormValues } from '$lib/fields';

	let {
		type,
		initial,
		message = null,
		editing = false
	}: { type: ListingType; initial: FormValues; message?: string | null; editing?: boolean } = $props();

	// svelte-ignore state_referenced_locally — the form owns its values after the first render
	let values = $state<FormValues>({ ...initial });
	let uncertain = $state<string[]>([]);
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
			const data = parsed.listing ?? parsed;
			if (data.type && data.type !== type) {
				jsonMessage = { ok: false, text: `This JSON is for a "${data.type}" listing — switch type first.` };
				return;
			}
			values = { ...values, ...Object.fromEntries(Object.entries(toFormValues(type, data)).filter(([, v]) => v !== '')) };
			uncertain = Array.isArray(parsed.uncertain) ? parsed.uncertain : [];
			const warnings: string[] = Array.isArray(parsed.warnings) ? parsed.warnings : [];
			jsonMessage = {
				ok: true,
				text: 'Filled in — check the highlighted fields.' + (warnings.length ? ' ⚠️ ' + warnings.join(' · ') : '')
			};
		} catch {
			jsonMessage = { ok: false, text: "That doesn't look like valid JSON." };
		}
	}

	const isEmpty = (name: string) => !values[name];
</script>

<details class="card paste" open={!editing}>
	<summary class="mono">Paste JSON (from Claude or another AI)</summary>
	<textarea bind:value={jsonText} placeholder={'{ "type": "' + type + '", "listing": { … } }'} rows="5"></textarea>
	<button type="button" class="btn small" onclick={importJson} disabled={!jsonText.trim()}>Fill the form</button>
	{#if jsonMessage}<p class="notice" class:error={!jsonMessage.ok} class:ok={jsonMessage.ok}>{jsonMessage.text}</p>{/if}
</details>

<form
	method="POST"
	action="?/save"
	use:enhance={() => {
		saving = true;
		return async ({ update }) => {
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
		<button class="btn primary" type="submit" name="intent" value={editing ? '' : 'publish'} disabled={saving}>
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
