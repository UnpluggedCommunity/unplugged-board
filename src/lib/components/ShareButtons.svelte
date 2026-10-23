<script lang="ts">
	import { whatsappText, type Listing } from '$lib/format';

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
	<button type="button" class="btn small" onclick={copy}>{copied ? '✓ Copied' : 'Copy for WhatsApp'}</button>
	<button type="button" class="btn small ghost" onclick={share}>Share</button>
</div>

<style>
	.share {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
</style>
