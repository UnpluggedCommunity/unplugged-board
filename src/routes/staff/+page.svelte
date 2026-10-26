<script lang="ts">
	import { deserialize, enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import Icon from '$lib/components/Icon.svelte';
	import ShareButtons from '$lib/components/ShareButtons.svelte';
	import { digestText, GROUPS } from '$lib/digest';
	import { formatDay, formatPrice, listingPath, place, type Listing } from '$lib/format';
	import { uploadShareCard } from '$lib/publish-client';

	let { data, form } = $props();

	let copied = $state<string | null>(null);
	let busy = $state<string | null>(null);

	const digests = $derived(GROUPS.map((g) => ({ group: g, ...digestText(g, data.today, data.origin) })));

	async function copyDigest(id: string, text: string) {
		try {
			await navigator.clipboard.writeText(text);
		} catch {
			/* old browsers: user can use Share */
		}
		copied = id;
		setTimeout(() => (copied = null), 2000);
	}
	async function shareDigest(text: string) {
		if (navigator.share) await navigator.share({ text }).catch(() => {});
		else window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
	}

	/** Publish one listing and draw its WhatsApp card. */
	async function publish(l: Listing) {
		const fd = new FormData();
		fd.set('id', String(l.id));
		const res = await fetch('?/publish', { method: 'POST', body: fd, headers: { accept: 'application/json', 'x-sveltekit-action': 'true' } });
		if (deserialize(await res.text()).type !== 'success') return false;
		if (!l.og_image) await uploadShareCard({ ...l, status: 'published' });
		return true;
	}

	async function publishOne(l: Listing) {
		busy = `pub-${l.id}`;
		await publish(l);
		busy = null;
		await invalidateAll();
	}

	async function publishAll() {
		if (!confirm(`Publish all ${data.listings.length} drafts?`)) return;
		let n = 0;
		for (const l of data.listings) {
			busy = `Publishing ${++n} of ${data.listings.length}…`;
			await publish(l);
		}
		busy = null;
		await invalidateAll();
	}

	const reportGroups = $derived.by(() => {
		const map = new Map<number, { listing_id: number; title: string; type: string; status: string; taken: number; suspicious: string[] }>();
		for (const r of data.reports) {
			const l = r.listings as unknown as { type: string; title: string; status: string } | null;
			const g = map.get(r.listing_id) ?? { listing_id: r.listing_id, title: l?.title ?? `#${r.listing_id}`, type: l?.type ?? 'job', status: l?.status ?? '', taken: 0, suspicious: [] as string[] };
			if (r.kind === 'taken') g.taken++;
			else g.suspicious.push(r.note ?? '(no details)');
			map.set(r.listing_id, g);
		}
		return [...map.values()];
	});
	const pathOf = (type: string, id: number) => listingPath({ type: type as Listing['type'], id });
</script>

<svelte:head><title>Staff · Unplugged Board</title></svelte:head>

<section class="wrap staff">
	<div class="head">
		<h1 class="page-title">Staff</h1>
		{#if data.me?.isAdmin}<a class="btn small ghost" href="/admin">Admin</a>{/if}
	</div>

	<a class="btn primary block new" href="/staff/new"><Icon name="sparkles" size={18} />New listings — from screenshots</a>

	<!-- Reports -->
	{#if reportGroups.length}
		<div class="card panel alert">
			<h2 class="section-label">Reports ({reportGroups.length})</h2>
			{#each reportGroups as g}
				<div class="item">
					<p>
						<a href={pathOf(g.type, g.listing_id)}>{g.title}</a>
						{#if g.status === 'hidden'}<span class="badge">auto-hidden</span>{/if}
						<br />
						<span class="muted small">
							{#if g.taken}{g.taken} × already taken{/if}{#if g.taken && g.suspicious.length} · {/if}{#if g.suspicious.length}suspicious: {g.suspicious.join(' / ')}{/if}
						</span>
					</p>
					<form method="POST" action="?/reports" use:enhance class="btns">
						<input type="hidden" name="listing_id" value={g.listing_id} />
						<button class="btn small" name="decision" value="keep">Keep live</button>
						<button class="btn small danger" name="decision" value="remove">Take down</button>
					</form>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Removal requests -->
	{#if data.removals.length}
		<div class="card panel alert">
			<h2 class="section-label">Removal requests ({data.removals.length})</h2>
			{#each data.removals as r}
				{@const l = r.listings as unknown as { type: string; title: string } | null}
				<div class="item">
					<p>
						<a href={l ? pathOf(l.type, r.listing_id) : '#'}>{l?.title ?? `Listing #${r.listing_id}`}</a> — {r.reason}
						{#if r.email}<br /><span class="muted mono small">{r.email}</span>{/if}
					</p>
					<form method="POST" action="?/handled" use:enhance>
						<input type="hidden" name="id" value={r.id} />
						<button class="btn small">Done</button>
					</form>
				</div>
			{/each}
		</div>
	{/if}

	<!-- WhatsApp digest -->
	<details class="card panel">
		<summary class="section-label"><Icon name="chat" size={15} />WhatsApp daily digest ({data.today.length} new in 24h)</summary>
		<p class="muted small">One message per group with everything published in the last 24 hours.</p>
		{#each digests as d}
			<div class="item">
				<p><strong>{d.group.name}</strong> <span class="muted small">· {d.count} listing{d.count === 1 ? '' : 's'}</span></p>
				<div class="btns">
					<button class="btn small" disabled={!d.count} onclick={() => copyDigest(d.group.id, d.text)}>
						<Icon name={copied === d.group.id ? 'check' : 'copy'} size={15} />{copied === d.group.id ? 'Copied' : 'Copy'}
					</button>
					<button class="btn small ghost" disabled={!d.count} onclick={() => shareDigest(d.text)}><Icon name="share" size={15} />Share</button>
				</div>
			</div>
		{/each}
	</details>

	<nav class="views mono">
		{#each Object.entries(data.views) as [id, label]}
			<a href="?view={id}" class:on={data.view === id}>{label}</a>
		{/each}
	</nav>

	{#if form?.message}<p class="notice error">{form.message}</p>{/if}

	{#if data.view === 'draft' && data.listings.length > 1}
		<button class="btn primary" onclick={publishAll} disabled={!!busy}>{busy?.startsWith('Publishing') ? busy : `Publish all ${data.listings.length} drafts`}</button>
	{/if}

	{#each data.listings as l (l.id)}
		<div class="card row">
			<div class="info">
				<span class="badge">{l.type}</span>
				<a class="title" href={listingPath(l)}>{l.title}</a>
				<p class="muted meta mono">
					{[formatPrice(l), place(l)].filter(Boolean).join(' · ')} · expires {formatDay(l.expires_at)}
				</p>
			</div>
			<div class="buttons">
				{#if data.view === 'live'}<ShareButtons listing={l} origin={data.origin} />{/if}
				<a class="btn small ghost" href="/staff/edit/{l.id}">Edit</a>
				{#if data.view === 'draft' || data.view === 'hidden'}
					<button class="btn small" onclick={() => publishOne(l)} disabled={!!busy}>{busy === `pub-${l.id}` ? 'Publishing…' : 'Publish'}</button>
				{/if}
				<form method="POST" use:enhance>
					<input type="hidden" name="id" value={l.id} />
					{#if data.view !== 'draft'}
						<button class="btn small ghost" formaction="?/renew">Renew</button>
					{/if}
					{#if data.view === 'live'}
						<button class="btn small ghost" formaction="?/archive">Archive</button>
					{/if}
					<button
						class="btn small danger"
						formaction="?/delete"
						onclick={(e) => !confirm('Delete this listing for good?') && e.preventDefault()}>Delete</button
					>
				</form>
			</div>
		</div>
	{:else}
		<p class="muted">Nothing here.</p>
	{/each}
</section>

<style>
	.staff {
		padding-top: 20px;
		display: grid;
		gap: 14px;
	}
	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.new {
		min-height: 52px;
	}
	.panel {
		display: grid;
		gap: 10px;
	}
	.panel h2,
	.panel summary {
		margin: 0;
		cursor: pointer;
	}
	.alert {
		border-color: #6b2230;
	}
	.item {
		display: flex;
		gap: 10px;
		justify-content: space-between;
		align-items: start;
		border-top: 1px solid var(--line);
		padding-top: 10px;
	}
	.item p {
		margin: 0;
		font-size: 14px;
	}
	.btns {
		display: flex;
		gap: 6px;
		flex: none;
		margin: 0;
	}
	.small {
		font-size: 12px;
	}
	.views {
		display: flex;
		gap: 16px;
		font-size: 14px;
		overflow-x: auto;
	}
	.views a {
		color: var(--muted);
		text-decoration: none;
		padding: 6px 0;
		white-space: nowrap;
	}
	.views a.on {
		color: var(--gold);
		border-bottom: 2px solid var(--gold);
	}
	.row {
		display: grid;
		gap: 10px;
	}
	.title {
		display: block;
		margin-top: 6px;
		color: var(--cream);
		font-weight: 600;
		font-size: 17px;
	}
	.meta {
		margin: 4px 0 0;
		font-size: 12px;
	}
	.buttons,
	.buttons form {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin: 0;
	}
</style>
