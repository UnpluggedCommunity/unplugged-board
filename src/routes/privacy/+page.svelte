<svelte:head>
	<title>Privacy · Unplugged Board</title>
</svelte:head>

<article class="wrap prose">
	<h1 class="display">Privacy</h1>
	<p class="muted">Last updated: 26 October 2026</p>

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
		<li>
			<strong>Job profile and CVs (only if you create them):</strong> the details you enter to apply for
			jobs (name, contacts, visa, licence, tickets, experience) and up to 3 CV files. Only you can see
			them.
		</li>
		<li><strong>Applications:</strong> the messages you send through the board (recipient, subject, text, which CV), so you can find them in "My applications".</li>
	</ul>

	<h2>What we don't do</h2>
	<ul>
		<li>We don't sell or share your data with advertisers.</li>
		<li>We don't keep screenshots of the original posts — only the information extracted from them.</li>
		<li>Contact details are only visible to logged-in members who entered the access code.</li>
	</ul>

	<h2>Service providers</h2>
	<p>
		The site runs on Cloudflare (hosting) and Supabase (database, login and file storage). These
		providers may process data outside Australia.
	</p>

	<h2 id="gmail">Google account and Gmail</h2>
	<p>
		We use Sign in with Google for your name, email and profile picture. If you choose
		<strong>Send from my Gmail</strong>, we separately ask for the <code>gmail.send</code> permission and use it
		only to send the application you reviewed, to the employer of that listing, with the CV you chose. We
		can't read, search or delete your emails. The access token expires after about an hour and isn't saved
		in our database. You can revoke access any time at
		<a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener">myaccount.google.com/permissions</a>.
	</p>
	<p>
		Unplugged Board's use and transfer of information received from Google APIs adheres to the
		<a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener">Google API Services User Data Policy</a>,
		including the Limited Use requirements. We never use Google user data for advertising, never sell it,
		and never use it to train AI models.
	</p>

	<h2 id="ai">AI</h2>
	<p>
		When you tap <strong>Write it for me</strong>, the job ad and your job profile — but not your phone,
		email or CV file — are sent to Google's Gemini API to write the draft. When staff use AI to read a
		screenshot of a listing, the image is sent too. We use Gemini's free tier: under Google's terms,
		Google may use this content to improve its products and trained reviewers may read it. Don't put
		anything in your profile you wouldn't put in a CV. You can always edit the draft, or write your
		message yourself.
	</p>

	<h2>How long we keep it</h2>
	<p>
		Listings expire automatically (jobs after 10 days, rooms after 14, marketplace after 30) and are
		archived. Photos of archived listings are deleted after 30 days. Your account, job profile and CVs stay
		until you delete them (CVs: Me → My CVs) or ask us to delete your account.
	</p>

	<h2 id="removal">Removal and deletion</h2>
	<p>
		Is a listing about you, or wrong? Open it and tap <strong>Request removal</strong> at the bottom of
		the page — no account needed. To delete your account or ask what we hold about you, message the
		Unplugged staff in the WhatsApp Community or email
		<a href="mailto:hello@unplugged-au.com">hello@unplugged-au.com</a>.
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
	code {
		font-family: var(--font-mono);
		font-size: 14px;
		color: var(--gold);
	}
</style>
