<script lang="ts">
	import { jobCategory } from '$lib/constants';
	import {
		formatPrice,
		isNew,
		keyFacts,
		listingPath,
		place,
		startText,
		timeAgo,
		type Listing
	} from '$lib/format';

	let { listing: l }: { listing: Listing } = $props();

	const price = $derived(formatPrice(l));
	const where = $derived(place(l));
	const when = $derived(startText(l));
	const cat = $derived(jobCategory(l.job_category));
	const facts = $derived(keyFacts(l).slice(0, 3));
</script>

<a class="card listing" href={listingPath(l)}>
	{#if l.photos.length}
		<img class="thumb" src={l.photos[0]} alt="" loading="lazy" width="96" height="96" />
	{/if}
	<div class="body">
		<div class="badges">
			{#if isNew(l)}<span class="badge new">New</span>{/if}
			{#if cat}<span class="badge">{cat.label}</span>{/if}
			{#if l.type === 'job' && l.whv_417 === 'likely'}<span class="badge whv">417 likely eligible</span>{/if}
		</div>
		<h2 class="title">{l.title}</h2>
		<div class="chips">
			{#if price}<span class="chip money">💰 {price}</span>{/if}
			{#if where}<span class="chip">📍 {where}</span>{/if}
			{#if when}<span class="chip">📅 {when}</span>{/if}
		</div>
		{#if facts.length}
			<p class="facts">{facts.join(' · ')}</p>
		{/if}
		<p class="label ago">{timeAgo(l.published_at)}</p>
	</div>
</a>

<style>
	.listing {
		display: flex;
		gap: 14px;
		color: inherit;
		text-decoration: none;
		transition: border-color 0.15s;
	}
	.listing:hover {
		border-color: #4a443d;
	}
	.thumb {
		flex: none;
		width: 84px;
		height: 84px;
		border-radius: 10px;
		object-fit: cover;
		background: var(--surface-2);
	}
	.body {
		min-width: 0;
		flex: 1;
	}
	.badges {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-bottom: 6px;
	}
	.badges:empty {
		display: none;
	}
	.title {
		font-size: 19px;
		font-weight: 600;
		margin: 0 0 10px;
		overflow-wrap: anywhere;
	}
	.facts {
		margin: 10px 0 0;
		font-size: 14px;
		color: var(--muted);
	}
	.ago {
		margin: 8px 0 0;
		font-size: 11px;
	}
</style>
