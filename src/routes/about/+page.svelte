<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { TAGLINE } from '$lib/constants';
</script>

<svelte:head>
	<title>About · Unplugged Board</title>
	<meta
		name="description"
		content="Unplugged Board: hand-picked jobs and rooms in Perth and WA for backpackers and working holiday makers, with one-tap applications."
	/>
</svelte:head>

<article class="wrap prose">
	<p class="eyebrow mono">About</p>
	<h1 class="page-title">Unplugged Board</h1>
	<p class="lead">
		The job and room board of <strong>Unplugged</strong>, a community of backpackers and expats in Perth,
		Western Australia. {TAGLINE}
	</p>

	<h2>What it does</h2>
	<ul class="features">
		<li><Icon name="briefcase" size={18} /><span><strong>Hand-picked listings.</strong> The Unplugged crew selects jobs, rooms and items every day and turns them into clear cards you can filter by zone, pay and date.</span></li>
		<li><Icon name="user" size={18} /><span><strong>One job profile.</strong> Members fill in their experience, visa, licence and tickets once, and keep up to 3 CVs.</span></li>
		<li><Icon name="sparkles" size={18} /><span><strong>Applications written for you.</strong> For each job, AI drafts a professional email from the member's own profile. The member reviews and edits it before sending.</span></li>
		<li><Icon name="mail" size={18} /><span><strong>Sent from your own Gmail.</strong> If the member chooses, the application is sent from their Gmail with the chosen CV attached.</span></li>
	</ul>

	<h2 id="google">How we use your Google account</h2>
	<ul>
		<li><strong>Sign in with Google</strong> gives us your name, email address and profile picture, used only to run your account.</li>
		<li>
			<strong>Send from my Gmail</strong> is optional and asked separately, only when you press it. It uses the
			<code>gmail.send</code> permission: Unplugged can send the application you just reviewed, to the employer
			shown on screen, with the CV you selected. We <strong>cannot read, search or delete</strong> your emails.
		</li>
		<li>
			We send one email each time you press Send. We keep a copy of what you sent in your "My applications" page.
			The Gmail access token expires after about an hour and is not stored in our database.
		</li>
		<li>You can remove access at any time from <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener">your Google Account permissions</a>.</li>
	</ul>
	<p>
		Unplugged Board's use and transfer of information received from Google APIs adheres to the
		<a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener">Google API Services User Data Policy</a>,
		including the Limited Use requirements. Read the full <a href="/privacy">Privacy Policy</a>.
	</p>

	<h2>Who runs it</h2>
	<p>
		Unplugged is a volunteer-run community based in Perth, WA. It is not an employment agency or a real estate
		agent. Contact: <a href="mailto:hello@unplugged-au.com">hello@unplugged-au.com</a>.
	</p>

	<div class="cta">
		<a class="btn primary" href="/jobs">Browse jobs</a>
		<a class="btn" href="/privacy">Privacy Policy</a>
	</div>
</article>

<style>
	.prose {
		padding-top: 24px;
		max-width: 680px;
	}
	.eyebrow {
		margin: 0 0 4px;
		font-size: 11.5px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--muted);
	}
	.lead {
		font-size: 18px;
		margin: 12px 0 0;
	}
	h2 {
		font-size: 18px;
		margin-top: 28px;
		color: var(--gold);
	}
	li {
		margin-bottom: 8px;
	}
	.features {
		list-style: none;
		padding: 0;
		display: grid;
		gap: 10px;
	}
	.features li {
		display: flex;
		gap: 12px;
		align-items: flex-start;
		padding: 14px;
		border-radius: 14px;
		border: 1px solid var(--line);
		background: var(--surface);
		margin: 0;
	}
	.features :global(.icon) {
		color: var(--gold);
		margin-top: 2px;
	}
	code {
		font-family: var(--font-mono);
		font-size: 14px;
		color: var(--gold);
	}
	.cta {
		display: flex;
		gap: 10px;
		margin-top: 24px;
	}
</style>
