<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { TAGLINE } from '$lib/constants';

	let { data, children } = $props();

	const tabs = [
		{ href: '/jobs', label: 'Jobs', match: ['/jobs', '/j/'] },
		{ href: '/rooms', label: 'Rooms', match: ['/rooms', '/r/'] }
	];
	const active = (match: string[]) => match.some((m) => page.url.pathname.startsWith(m));
</script>

<header class="top">
	<div class="wrap bar">
		<a href="/jobs" class="logo" aria-label="Unplugged Board home">
			<img src="/logo-360.webp" srcset="/logo-360.webp 1x, /logo-720.webp 2x" alt="Unplugged" width="148" height="28" />
			<span class="label board">Board</span>
		</a>
		<nav class="account">
			{#if data.me}
				{#if data.me.isStaff}
					<a class="btn small" href="/staff">Staff</a>
				{:else if !data.me.isMember}
					<a class="btn small primary" href="/join">Enter code</a>
				{/if}
				<form method="POST" action="/logout">
					<button class="btn small ghost" type="submit">Log out</button>
				</form>
			{:else}
				<a class="btn small primary" href="/login?next={encodeURIComponent(page.url.pathname)}">Log in</a>
			{/if}
		</nav>
	</div>
	<nav class="wrap tabs" aria-label="Sections">
		{#each tabs as t}
			<a href={t.href} class="tab display" class:on={active(t.match)} aria-current={active(t.match) ? 'page' : undefined}>
				{t.label}
			</a>
		{/each}
		<span class="tab display soon" title="Coming soon">Market<small class="label">soon</small></span>
	</nav>
</header>

<main>
	{@render children()}
</main>

<footer class="wrap foot">
	<p class="display tag">{TAGLINE}</p>
	<p class="muted small">
		Unplugged is a community, not an employment agency or real estate agent. Listings come from third
		parties: always check them yourself before paying or signing anything.
	</p>
	<p class="links mono">
		<a href="/privacy">Privacy</a> · <a href="/privacy#removal">Request removal</a>
	</p>
</footer>

<style>
	.top {
		position: relative;
		background: #0d0c0b;
		border-bottom: 1px solid var(--line);
		overflow: hidden;
	}
	/* Light grain — header only, never on content */
	.top::before {
		content: '';
		position: absolute;
		inset: 0;
		pointer-events: none;
		opacity: 0.12;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
	}
	.bar {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding-top: 12px;
		padding-bottom: 8px;
	}
	.logo {
		display: flex;
		align-items: center;
		gap: 8px;
		text-decoration: none;
	}
	.logo img {
		height: 28px;
		width: auto;
	}
	.board {
		color: var(--gold);
	}
	.account {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.account form {
		margin: 0;
	}
	.tabs {
		position: relative;
		display: flex;
		gap: 22px;
		padding-top: 6px;
	}
	.tab {
		position: relative;
		display: inline-flex;
		align-items: baseline;
		gap: 6px;
		padding: 8px 0 10px;
		font-size: 22px;
		color: var(--muted);
		text-decoration: none;
	}
	.tab.on {
		color: var(--cream);
	}
	.tab.on::after {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		height: 3px;
		border-radius: 3px;
		background: var(--gold);
	}
	.soon {
		opacity: 0.45;
	}
	.soon small {
		font-size: 10px;
	}
	main {
		min-height: 60vh;
	}
	.foot {
		margin-top: 48px;
		padding-top: 24px;
		padding-bottom: 40px;
		border-top: 1px solid var(--line);
	}
	.tag {
		font-size: 20px;
		color: var(--gold);
		margin: 0 0 8px;
	}
	.small {
		font-size: 13px;
	}
	.links {
		font-size: 13px;
	}
</style>
