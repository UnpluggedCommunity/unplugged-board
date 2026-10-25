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
	import Icon from './Icon.svelte';
	import SaveButton from './SaveButton.svelte';

	let { listing: l, saved = false }: { listing: Listing; saved?: boolean } = $props();

	const price = $derived(formatPrice(l));
	const where = $derived(place(l));
	const when = $derived(startText(l));
	const cat = $derived(jobCategory(l.job_category));
	const facts = $derived(keyFacts(l).slice(0, 3));
	const accent = $derived(
		l.type === 'room'
			? 'var(--cream)'
			: ({ hospitality: 'var(--gold)', construction: 'var(--orange)', farm: '#9cc58a', mining: 'var(--orange)', cleaning: '#8fc3d1', warehouse: '#c9b7f0' } as Record<string, string>)[l.job_category ?? ''] ?? 'var(--muted)'
	);
</script>

<a class="listing" href={listingPath(l)} style="--accent: {accent}">
	{#if l.photos.length}
		<img class="cover" src={l.photos[0]} alt="" loading="lazy" />
	{/if}
	<div class="body">
		<div class="top">
			<span class="kicker mono">
				<i class="dot"></i>{l.type === 'room' ? 'Room' : (cat?.label ?? 'Job')}
				{#if isNew(l)}<b class="new">New</b>{/if}
			</span>
			<SaveButton id={l.id} {saved} />
		</div>

		<h2 class="title">{l.title}</h2>

		{#if price}<p class="price mono">{price}</p>{/if}

		<div class="meta">
			{#if where}<span><Icon name="pin" size={15} />{where}</span>{/if}
			{#if when}<span><Icon name="calendar" size={15} />{when}</span>{/if}
		</div>

		{#if facts.length || l.apply_channel || l.whv_417 === 'likely'}
			<div class="tags">
				{#if l.type === 'job' && (l.apply_channel === 'email' || l.apply_channel === 'phone')}
					<span class="tag quick"><Icon name="bolt" size={13} filled />Quick apply</span>
				{/if}
				{#if l.type === 'job' && l.whv_417 === 'likely'}<span class="tag whv">417 likely eligible</span>{/if}
				{#each facts as f}<span class="tag">{f}</span>{/each}
			</div>
		{/if}

		<p class="ago mono">{timeAgo(l.published_at)}</p>
	</div>
</a>

<style>
	.listing {
		display: block;
		overflow: hidden;
		border-radius: var(--radius);
		border: 1px solid var(--line);
		background: linear-gradient(180deg, #181716 0%, var(--surface) 70%);
		color: inherit;
		text-decoration: none;
		transition:
			border-color 0.15s,
			transform 0.15s;
	}
	.listing:hover {
		border-color: #4a443d;
	}
	.listing:active {
		transform: scale(0.99);
	}
	.cover {
		width: 100%;
		aspect-ratio: 16 / 9;
		object-fit: cover;
		background: var(--surface-2);
	}
	.body {
		position: relative;
		padding: 14px 16px 14px;
	}
	.body::before {
		content: '';
		position: absolute;
		left: 0;
		top: 18px;
		width: 3px;
		height: 22px;
		border-radius: 0 3px 3px 0;
		background: var(--accent);
	}
	.top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		margin: -4px -4px 4px 0;
	}
	.kicker {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		font-size: 11.5px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--muted);
	}
	.dot {
		display: none;
	}
	.new {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		font-weight: 600;
		color: var(--cream);
	}
	.new::before {
		content: '';
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--red);
		box-shadow: 0 0 8px var(--red-glow);
	}
	.title {
		font-size: 19px;
		font-weight: 600;
		line-height: 1.25;
		margin: 0 0 6px;
		overflow-wrap: anywhere;
	}
	.price {
		margin: 0 0 8px;
		font-size: 19px;
		font-weight: 600;
		color: var(--gold);
	}
	.meta {
		display: flex;
		flex-wrap: wrap;
		gap: 4px 16px;
		font-size: 14px;
		color: #d8d1c5;
	}
	.meta span {
		display: inline-flex;
		align-items: center;
		gap: 5px;
	}
	.meta :global(.icon) {
		color: var(--muted);
	}
	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-top: 12px;
	}
	.tag {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 4px 9px;
		border-radius: 8px;
		background: var(--surface-3);
		font-size: 12.5px;
		color: #d8d1c5;
	}
	.tag.quick {
		background: var(--gold-soft);
		color: var(--gold);
		font-weight: 600;
	}
	.tag.whv {
		background: rgba(143, 209, 158, 0.12);
		color: var(--ok);
	}
	.ago {
		margin: 10px 0 0;
		font-size: 11px;
		color: var(--muted);
	}
</style>
