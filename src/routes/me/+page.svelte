<script lang="ts">
	import Icon, { type IconName } from '$lib/components/Icon.svelte';
	import { firstName } from '$lib/profile';

	let { data } = $props();

	const name = $derived(firstName(data.profile) ?? data.me?.name?.split(' ')[0] ?? 'there');
	const tiles: { href: string; icon: IconName; title: string; sub: string }[] = $derived([
		{
			href: '/me/profile',
			icon: 'user',
			title: 'Job profile',
			sub: data.profile ? `${data.percent}% complete` : 'Start here — 3 minutes'
		},
		{ href: '/me/cvs', icon: 'file', title: 'My CVs', sub: `${data.cvCount} of 3 uploaded` },
		{ href: '/me/applications', icon: 'send', title: 'Applications', sub: `${data.appCount} sent` },
		{ href: '/saved', icon: 'bookmark', title: 'Saved', sub: `${data.savedCount} listings` }
	]);
</script>

<svelte:head><title>Me · Unplugged Board</title></svelte:head>

<section class="wrap me">
	<p class="eyebrow mono">Your space</p>
	<h1 class="page-title">G'day, {name}</h1>

	<div class="progress card">
		<div class="progress-head">
			<span class="section-label"><Icon name="sparkles" size={15} />Apply in one tap</span>
			<span class="mono pct">{data.percent}%</span>
		</div>
		<div class="bar" role="progressbar" aria-valuenow={data.percent} aria-valuemin="0" aria-valuemax="100">
			<i style="width: {data.percent}%"></i>
		</div>
		{#if data.missing.length || data.cvCount === 0}
			<p class="muted">
				To let the AI write your applications, add
				{[...data.missing, ...(data.cvCount === 0 ? ['a CV'] : [])].join(', ')}.
			</p>
			<a class="btn primary block" href={data.missing.length ? '/me/profile' : '/me/cvs'}>
				{data.profile ? 'Finish my profile' : 'Build my job profile'}
			</a>
		{:else}
			<p class="muted">You're ready: open any job and tap <strong>Apply with Unplugged</strong>.</p>
			<a class="btn block" href="/jobs">Browse jobs</a>
		{/if}
	</div>

	<div class="tiles">
		{#each tiles as t}
			<a class="tile" href={t.href}>
				<span class="tile-icon"><Icon name={t.icon} size={20} /></span>
				<strong>{t.title}</strong>
				<span class="muted mono small">{t.sub}</span>
			</a>
		{/each}
	</div>

	<div class="account card">
		<p class="muted small mono">{data.me?.email}</p>
		{#if data.me && !data.me.isMember}
			<a class="btn small primary" href="/join">Enter access code</a>
		{/if}
		{#if data.me?.isStaff}<a class="btn small ghost" href="/staff">Staff area</a>{/if}
		<form method="POST" action="/logout">
			<button class="btn small ghost" type="submit"><Icon name="logout" size={16} />Log out</button>
		</form>
	</div>
</section>

<style>
	.me {
		padding-top: 24px;
		display: grid;
		gap: 16px;
	}
	.eyebrow {
		margin: 0 0 -8px;
		font-size: 11.5px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--muted);
	}
	.progress {
		display: grid;
		gap: 12px;
	}
	.progress p {
		margin: 0;
	}
	.progress-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.progress-head .section-label {
		margin: 0;
	}
	.pct {
		font-size: 20px;
		font-weight: 600;
		color: var(--gold);
	}
	.bar {
		height: 8px;
		border-radius: 8px;
		background: var(--surface-3);
		overflow: hidden;
	}
	.bar i {
		display: block;
		height: 100%;
		border-radius: 8px;
		background: linear-gradient(90deg, var(--orange), var(--gold));
	}
	.tiles {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
	}
	.tile {
		display: grid;
		gap: 4px;
		padding: 16px;
		border-radius: var(--radius);
		border: 1px solid var(--line);
		background: var(--surface);
		color: var(--cream);
		text-decoration: none;
	}
	.tile:hover {
		border-color: #4a443d;
	}
	.tile-icon {
		display: grid;
		place-items: center;
		width: 38px;
		height: 38px;
		border-radius: 12px;
		background: var(--gold-soft);
		color: var(--gold);
		margin-bottom: 6px;
	}
	.small {
		font-size: 12px;
	}
	.account {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
	}
	.account p {
		flex: 1 1 100%;
		margin: 0;
	}
	.account form {
		margin: 0;
	}
</style>
