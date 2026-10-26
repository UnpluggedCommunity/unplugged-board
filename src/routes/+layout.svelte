<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import Icon, { type IconName } from '$lib/components/Icon.svelte';
	import { TAGLINE } from '$lib/constants';

	let { data, children } = $props();

	const nav: { href: string; label: string; icon: IconName; match: string[] }[] = [
		{ href: '/jobs', label: 'Jobs', icon: 'briefcase', match: ['/jobs', '/j/', '/apply'] },
		{ href: '/rooms', label: 'Rooms', icon: 'home', match: ['/rooms', '/r/'] },
		{ href: '/saved', label: 'Saved', icon: 'bookmark', match: ['/saved'] },
		{ href: '/me', label: 'Me', icon: 'user', match: ['/me', '/login', '/join'] }
	];
	const active = (match: string[]) => match.some((m) => page.url.pathname.startsWith(m));
	const initial = $derived((data.me?.name ?? data.me?.email ?? '?').trim().charAt(0).toUpperCase());
</script>

<header class="top">
	<div class="wrap bar">
		<a href="/jobs" class="logo" aria-label="Unplugged Board home">
			<img src="/logo-360.webp" srcset="/logo-360.webp 1x, /logo-720.webp 2x" alt="Unplugged" width="126" height="24" />
			<span class="board mono">BOARD</span>
		</a>
		<nav class="topnav" aria-label="Main">
			{#each nav as n}
				<a href={n.href} class:on={active(n.match)} aria-current={active(n.match) ? 'page' : undefined}>
					<Icon name={n.icon} size={17} filled={active(n.match) && n.icon === 'bookmark'} />{n.label}
				</a>
			{/each}
		</nav>
		<div class="account">
			{#if data.me?.isStaff}
				<a class="btn small ghost" href="/staff">Staff</a>
			{/if}
			{#if data.me}
				<a class="avatar" href="/me" aria-label="Your profile">{initial}</a>
			{:else}
				<a class="btn small primary" href="/login?next={encodeURIComponent(page.url.pathname)}">Log in</a>
			{/if}
		</div>
	</div>
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
		<a href="/about">About</a> · <a href="/privacy">Privacy</a> · <a href="/privacy#removal">Request removal</a>
	</p>
</footer>

<nav class="tabbar" aria-label="Main">
	{#each nav as n}
		<a href={n.href} class:on={active(n.match)} aria-current={active(n.match) ? 'page' : undefined}>
			<Icon name={n.icon} size={22} filled={active(n.match) && n.icon === 'bookmark'} />
			<span>{n.label}</span>
		</a>
	{/each}
</nav>

<style>
	.top {
		position: relative;
		background:
			radial-gradient(120% 140% at 0% 0%, rgba(228, 0, 43, 0.14), transparent 55%),
			#0d0c0b;
		border-bottom: 1px solid var(--line);
		overflow: hidden;
	}
	/* Light grain — header only, never on content */
	.top::before {
		content: '';
		position: absolute;
		inset: 0;
		pointer-events: none;
		opacity: 0.1;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
	}
	.bar {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		min-height: 58px;
		padding-top: env(safe-area-inset-top);
	}
	.logo {
		display: flex;
		align-items: center;
		gap: 8px;
		text-decoration: none;
	}
	.logo img {
		height: 24px;
		width: auto;
	}
	.board {
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.18em;
		color: var(--gold);
		padding: 3px 7px;
		border: 1px solid #4a3b26;
		border-radius: 6px;
	}
	.account {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.avatar {
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: var(--gold);
		color: #1a1208;
		font: 600 15px var(--font-sans);
		text-decoration: none;
	}
	main {
		min-height: 60vh;
	}
	.foot {
		margin-top: 40px;
		padding-top: 24px;
		padding-bottom: calc(var(--nav-h) + 32px + env(safe-area-inset-bottom));
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
	.tabbar {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 20;
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		height: calc(var(--nav-h) + env(safe-area-inset-bottom));
		padding-bottom: env(safe-area-inset-bottom);
		background: rgba(13, 12, 11, 0.94);
		backdrop-filter: blur(14px);
		-webkit-backdrop-filter: blur(14px);
		border-top: 1px solid var(--line);
	}
	.tabbar a {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 3px;
		color: var(--muted);
		text-decoration: none;
		font: 500 11px/1 var(--font-mono);
		letter-spacing: 0.04em;
		-webkit-tap-highlight-color: transparent;
	}
	.tabbar a.on {
		color: var(--gold);
	}
	.tabbar a.on::before {
		content: '';
		position: absolute;
		top: 0;
		width: 28px;
		height: 3px;
		border-radius: 0 0 3px 3px;
		background: var(--gold);
	}
	/* Desktop: navigation moves into the header, the bottom bar disappears */
	.topnav {
		display: none;
	}
	@media (min-width: 820px) {
		:global(:root) {
			--nav-h: 0px;
		}
		.tabbar {
			display: none;
		}
		.topnav {
			display: flex;
			gap: 4px;
			margin-left: auto;
		}
		.topnav a {
			display: inline-flex;
			align-items: center;
			gap: 7px;
			padding: 8px 14px;
			border-radius: 999px;
			color: var(--muted);
			text-decoration: none;
			font: 500 15px/1 var(--font-sans);
		}
		.topnav a:hover {
			color: var(--cream);
			background: var(--surface-2);
		}
		.topnav a.on {
			color: var(--gold);
			background: var(--gold-soft);
		}
	}
</style>
