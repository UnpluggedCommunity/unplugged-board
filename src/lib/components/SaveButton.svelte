<script lang="ts">
	import { page } from '$app/state';
	import Icon from './Icon.svelte';

	let { id, saved = false, label = false }: { id: number; saved?: boolean; label?: boolean } = $props();

	// svelte-ignore state_referenced_locally — optimistic local copy
	let on = $state(saved);
	let busy = $state(false);

	async function toggle(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		if (busy) return;
		busy = true;
		const next = !on;
		on = next;
		const res = await fetch('/api/save', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ id, save: next })
		}).catch(() => null);
		if (!res?.ok) on = !next;
		busy = false;
	}
</script>

{#if page.data.me}
	<button
		type="button"
		class={label ? 'btn' : 'icon-btn'}
		class:on
		aria-pressed={on}
		aria-label={on ? 'Remove from saved' : 'Save for later'}
		onclick={toggle}
	>
		<Icon name="bookmark" filled={on} size={label ? 18 : 18} />
		{#if label}{on ? 'Saved' : 'Save'}{/if}
	</button>
{:else}
	<a
		class={label ? 'btn' : 'icon-btn'}
		href="/login?next={encodeURIComponent(page.url.pathname)}"
		aria-label="Log in to save"
		onclick={(e) => e.stopPropagation()}
	>
		<Icon name="bookmark" />
		{#if label}Save{/if}
	</a>
{/if}
