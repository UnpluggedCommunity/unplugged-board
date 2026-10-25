<script lang="ts">
	import Icon, { type IconName } from '$lib/components/Icon.svelte';
	import { timeAgo } from '$lib/format';

	let { data } = $props();
	const ICONS: Record<string, IconName> = { email: 'mail', whatsapp: 'chat', sms: 'chat', link: 'link', manual: 'copy' };
	const HOW: Record<string, string> = {
		email: 'Email',
		whatsapp: 'WhatsApp',
		sms: 'SMS',
		link: 'Apply link',
		manual: 'Copied'
	};
</script>

<svelte:head><title>Applications · Unplugged Board</title></svelte:head>

<section class="wrap page">
	<a class="mono back" href="/me"><Icon name="back" size={16} />Me</a>
	<h1 class="page-title">Applications</h1>

	{#each data.applications as a (a.id)}
		<details class="app card">
			<summary>
				<span class="app-icon"><Icon name={ICONS[a.channel] ?? 'send'} size={18} /></span>
				<span class="app-info">
					<strong>{a.listing_title}</strong>
					<span class="muted mono small">
						{HOW[a.channel]}{a.sent_by_platform ? ' · sent by Unplugged' : ''} · {timeAgo(a.created_at)}
						{#if a.cvs}· {(a.cvs as unknown as { label: string }).label}{/if}
					</span>
				</span>
			</summary>
			{#if a.subject}<p class="subject">{a.subject}</p>{/if}
			{#if a.body}<pre class="body">{a.body}</pre>{/if}
			{#if a.listing_id}<a class="btn small ghost" href="/j/{a.listing_id}">Open the job</a>{/if}
		</details>
	{:else}
		<div class="empty card">
			<p class="display big">No applications yet</p>
			<p class="muted">Open a job and tap <strong>Apply with Unplugged</strong>: we write the message and attach your CV.</p>
			<a class="btn primary" href="/jobs">Browse jobs</a>
		</div>
	{/each}
</section>

<style>
	.page {
		padding-top: 16px;
		display: grid;
		gap: 12px;
	}
	.back {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: 13px;
		color: var(--muted);
		text-decoration: none;
	}
	summary {
		display: flex;
		gap: 12px;
		align-items: center;
		cursor: pointer;
		list-style: none;
	}
	summary::-webkit-details-marker {
		display: none;
	}
	.app-icon {
		display: grid;
		place-items: center;
		flex: none;
		width: 38px;
		height: 38px;
		border-radius: 12px;
		background: var(--gold-soft);
		color: var(--gold);
	}
	.app-info {
		display: grid;
		gap: 2px;
		min-width: 0;
	}
	.small {
		font-size: 12px;
	}
	.subject {
		margin: 14px 0 6px;
		font-weight: 600;
	}
	.body {
		white-space: pre-wrap;
		font: 14px/1.55 var(--font-sans);
		color: #d8d1c5;
		margin: 0 0 12px;
	}
	.empty {
		text-align: center;
		display: grid;
		justify-items: center;
		gap: 8px;
		padding: 32px 18px;
	}
	.empty p {
		margin: 0;
	}
	.big {
		font-size: 26px;
	}
</style>
