<script lang="ts">
	import { whatsappText, type Listing } from '$lib/format';
	import Icon from './Icon.svelte';

	let { listing, origin, compact = false }: { listing: Listing; origin: string; compact?: boolean } =
		$props();

	let copied = $state(false);
	const text = $derived(whatsappText(listing, origin));

	async function copy() {
		try {
			await navigator.clipboard.writeText(text);
		} catch {
			// Old browsers: fall back to a hidden textarea
			const ta = document.createElement('textarea');
			ta.value = text;
			document.body.append(ta);
			ta.select();
			document.execCommand('copy');
			ta.remove();
		}
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	async function share() {
		if (navigator.share) {
			try {
				await navigator.share({ text });
				return;
			} catch {
				/* cancelled */
			}
		} else {
			window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
		}
	}
</script>

<div class="share" class:compact>
	{#if compact}
		<button type="button" class="icon-btn" class:on={copied} onclick={copy} aria-label="Copy for WhatsApp">
			<Icon name={copied ? 'check' : 'copy'} />
		</button>
		<button type="button" class="icon-btn" onclick={share} aria-label="Share"><Icon name="share" /></button>
	{:else}
		<button type="button" class="btn small" onclick={copy}>{copied ? '✓ Copied' : 'Copy for WhatsApp'}</button>
		<button type="button" class="btn small ghost" onclick={share}>Share</button>
	{/if}
</div>

<style>
	.share {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
</style>
