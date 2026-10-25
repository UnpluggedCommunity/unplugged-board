<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import ListingCard from '$lib/components/ListingCard.svelte';

	let { data } = $props();
</script>

<svelte:head><title>Saved · Unplugged Board</title></svelte:head>

<section class="wrap page">
	<p class="eyebrow mono">Shortlist</p>
	<h1 class="page-title">Saved</h1>

	{#each data.live as l (l.id)}
		<ListingCard listing={l} saved />
	{:else}
		<div class="empty">
			<div class="empty-icon"><Icon name="bookmark" size={28} /></div>
			<p class="display big">Nothing saved yet</p>
			<p class="muted">Tap the bookmark on a job or room to keep it here.</p>
			<a class="btn primary" href="/jobs">Browse jobs</a>
		</div>
	{/each}

	{#if data.gone.length}
		<h2 class="section-label gone-title">No longer available</h2>
		{#each data.gone as l (l.id)}
			<p class="gone muted">{l.title}</p>
		{/each}
	{/if}
</section>

<style>
	.page {
		padding-top: 24px;
		display: grid;
		gap: 12px;
	}
	.eyebrow {
		margin: 0 0 -6px;
		font-size: 11.5px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--muted);
	}
	.empty {
		display: grid;
		justify-items: center;
		gap: 6px;
		text-align: center;
		padding: 40px 20px;
		border: 1px dashed var(--line);
		border-radius: var(--radius);
	}
	.empty p {
		margin: 0 0 6px;
	}
	.empty-icon {
		display: grid;
		place-items: center;
		width: 60px;
		height: 60px;
		border-radius: 50%;
		background: var(--gold-soft);
		color: var(--gold);
	}
	.big {
		font-size: 26px;
		color: var(--cream);
	}
	.gone-title {
		margin-top: 12px;
		color: var(--muted);
	}
	.gone {
		margin: 0;
		text-decoration: line-through;
	}
</style>
