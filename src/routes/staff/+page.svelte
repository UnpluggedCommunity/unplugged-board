<script lang="ts">
	import { enhance } from '$app/forms';
	import ShareButtons from '$lib/components/ShareButtons.svelte';
	import { formatDay, formatPrice, listingPath, place } from '$lib/format';

	let { data, form } = $props();
</script>

<svelte:head><title>Staff · Unplugged Board</title></svelte:head>

<section class="wrap staff">
	<div class="head">
		<h1 class="display">Staff</h1>
		{#if data.me?.isAdmin}<a class="btn small ghost" href="/admin">Admin</a>{/if}
	</div>

	<a class="btn primary block new" href="/staff/new">+ New listing — from screenshots</a>

	{#if data.removals.length}
		<div class="card removals">
			<h2 class="label">Removal requests ({data.removals.length})</h2>
			{#each data.removals as r}
				<div class="removal">
					<p>
						<a href={r.listings ? listingPath({ type: (r.listings as any).type, id: r.listing_id }) : '#'}>
							{(r.listings as any)?.title ?? `Listing #${r.listing_id}`}</a
						> — {r.reason}
						{#if r.email}<br /><span class="muted mono">{r.email}</span>{/if}
					</p>
					<form method="POST" action="?/handled" use:enhance>
						<input type="hidden" name="id" value={r.id} />
						<button class="btn small">Done</button>
					</form>
				</div>
			{/each}
		</div>
	{/if}

	<nav class="views mono">
		{#each Object.entries(data.views) as [id, label]}
			<a href="?view={id}" class:on={data.view === id}>{label}</a>
		{/each}
	</nav>

	{#if form?.message}<p class="notice error">{form.message}</p>{/if}

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
				<form method="POST" use:enhance>
					<input type="hidden" name="id" value={l.id} />
					{#if data.view === 'draft'}
						<button class="btn small" formaction="?/publish">Publish</button>
					{/if}
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
	h1 {
		font-size: 36px;
		margin: 0;
	}
	.new {
		min-height: 52px;
	}
	.removals h2 {
		margin: 0 0 8px;
		color: var(--gold);
	}
	.removal {
		display: flex;
		gap: 10px;
		justify-content: space-between;
		align-items: start;
		border-top: 1px solid var(--line);
		padding-top: 8px;
	}
	.removal p {
		margin: 0;
		font-size: 14px;
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
