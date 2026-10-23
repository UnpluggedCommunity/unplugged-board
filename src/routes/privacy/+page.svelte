<svelte:head>
	<title>Privacy · Unplugged Board</title>
</svelte:head>

<article class="wrap prose">
	<h1 class="display">Privacy</h1>
	<p class="muted">Last updated: October 2026</p>

	<p>
		Unplugged is a volunteer-run community for backpackers and expats in Perth, Western Australia. We
		handle personal information in line with the Australian Privacy Principles. This page explains what
		we collect and how to ask us to delete it.
	</p>

	<h2>What we collect</h2>
	<ul>
		<li><strong>Your account:</strong> the name, email address and profile picture Google shares when you log in.</li>
		<li><strong>Access:</strong> whether you have entered the current Community Access Code.</li>
		<li>
			<strong>Listings:</strong> job, room and marketplace listings, including contact details the
			advertiser chose to publish (e.g. a phone number in a public Facebook post).
		</li>
		<li><strong>Removal requests:</strong> the reason and, if you give it, your email.</li>
	</ul>

	<h2>What we don't do</h2>
	<ul>
		<li>We don't sell or share your data with advertisers.</li>
		<li>We don't keep screenshots of the original posts — only the information extracted from them.</li>
		<li>Contact details are only visible to logged-in members who entered the access code.</li>
	</ul>

	<h2>Service providers</h2>
	<p>
		The site runs on Cloudflare (hosting) and Supabase (database and login). When staff use AI to read
		a screenshot of a listing, the image is sent to Google's Gemini API to extract the details. These
		providers may process data outside Australia.
	</p>

	<h2>How long we keep it</h2>
	<p>
		Listings expire automatically (jobs after 10 days, rooms after 14, marketplace after 30) and are
		archived. Photos of archived listings are deleted after 30 days. Your account stays until you ask us
		to delete it.
	</p>

	<h2 id="removal">Removal and deletion</h2>
	<p>
		Is a listing about you, or wrong? Open it and tap <strong>Request removal</strong> at the bottom of
		the page — no account needed. To delete your account or ask what we hold about you, message the
		Unplugged staff in the WhatsApp Community.
	</p>

	<h2>Disclaimer</h2>
	<p>
		Unplugged is not an employment agency or a real estate agent. Listings come from third parties and
		we can't guarantee them: always check before paying a bond, sharing documents or starting work.
	</p>
</article>

<style>
	.prose {
		padding-top: 24px;
		max-width: 680px;
	}
	h1 {
		font-size: 40px;
		margin-bottom: 4px;
	}
	h2 {
		font-size: 18px;
		margin-top: 28px;
		color: var(--gold);
	}
	li {
		margin-bottom: 6px;
	}
</style>
