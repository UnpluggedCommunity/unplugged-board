<script lang="ts">
	import { onMount } from 'svelte';
	import { deserialize, enhance } from '$app/forms';
	import { page } from '$app/state';
	import Icon from '$lib/components/Icon.svelte';
	import { jobCategory } from '$lib/constants';
	import { formatPay, place, timeAgo } from '$lib/format';

	let { data, form } = $props();

	type Draft = { subject: string; email: string; message: string; notes: string[] };

	const l = $derived(data.listing);
	// svelte-ignore state_referenced_locally — initial choice only
	let cvId = $state<string | null>(data.suggestedCv);
	let draft = $state<Draft | null>(null);
	let notice = $state<string | null>(null);
	let source = $state<'ai' | 'template' | null>(null);
	let writing = $state(false);
	let sending = $state(false);
	let subject = $state('');
	let body = $state('');
	let message = $state('');
	let copied = $state(false);
	let logged = $state<string | null>(null);

	const ready = $derived(data.missing.length === 0);
	const isEmail = $derived(data.channel === 'email');
	const cv = $derived(data.cvs.find((c) => c.id === cvId) ?? null);
	const sent = $derived(Boolean(form && 'sent' in form && form.sent));

	// The Gmail permission screen is a full-page redirect: keep the draft in this tab meanwhile.
	const storeKey = $derived(`unplugged-apply-${data.listing.id}`);
	const gmailDenied = $derived(page.url.searchParams.get('gmail') === 'denied');
	const needsReconnect = $derived(Boolean(form && 'reconnect' in form && form.reconnect));

	function connectGmail() {
		try {
			sessionStorage.setItem(storeKey, JSON.stringify({ draft, source, subject, body, message, cvId }));
		} catch {
			/* private mode: the draft is simply rewritten */
		}
		window.location.href = `/auth/gmail/start?next=${encodeURIComponent(`/apply/${data.listing.id}`)}`;
	}

	onMount(() => {
		try {
			const saved = sessionStorage.getItem(storeKey);
			if (!saved) return;
			sessionStorage.removeItem(storeKey);
			const s = JSON.parse(saved);
			({ draft, source, subject, body, message } = s);
			cvId = s.cvId ?? cvId;
		} catch {
			/* ignore */
		}
	});

	/** Australian numbers → international format for wa.me / sms. */
	const intl = (phone: string) => {
		const d = phone.replace(/[^\d+]/g, '').replace(/^\+/, '');
		if (/^0\d{9}$/.test(d)) return '61' + d.slice(1);
		return d;
	};

	async function log(channel: string, withText: string) {
		const fd = new FormData();
		fd.set('channel', channel);
		if (cvId) fd.set('cv_id', cvId);
		fd.set('subject', isEmail ? subject : '');
		fd.set('body', withText);
		const res = await fetch('?/log', { method: 'POST', body: fd, headers: { accept: 'application/json', 'x-sveltekit-action': 'true' } });
		const result = deserialize(await res.text());
		if (result.type === 'success') logged = channel;
	}

	async function cvFile(): Promise<File | null> {
		if (!cv) return null;
		const res = await fetch(`/me/cvs/${cv.id}`);
		if (!res.ok) return null;
		const blob = await res.blob();
		return new File([blob], cv.file_name, { type: blob.type || 'application/pdf' });
	}

	/** Mobile share sheet with the CV file (WhatsApp, Gmail, Outlook…). */
	async function shareCv(text: string) {
		const file = await cvFile();
		const payload: ShareData = file ? { files: [file], text } : { text };
		if (file && navigator.canShare?.({ files: [file] })) {
			try {
				await navigator.share(payload);
				return true;
			} catch {
				return false;
			}
		}
		// Desktop / unsupported: download the CV so it can be attached by hand.
		if (file) {
			const a = document.createElement('a');
			a.href = URL.createObjectURL(file);
			a.download = file.name;
			a.click();
		}
		return false;
	}

	async function copy(text: string) {
		await navigator.clipboard.writeText(text).catch(() => {});
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	function openWhatsApp() {
		window.open(`https://wa.me/${intl(data.phone!)}?text=${encodeURIComponent(message)}`, '_blank');
		log('whatsapp', message);
	}
	function openSms() {
		window.location.href = `sms:${intl(data.phone!).replace(/^61/, '+61')}?&body=${encodeURIComponent(message)}`;
		log('sms', message);
	}
	function openMail() {
		window.location.href = `mailto:${data.recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
		log('email', body);
	}
</script>

<svelte:head><title>Apply · {l.title} · Unplugged Board</title></svelte:head>

<section class="wrap page">
	<a class="mono back" href="/j/{l.id}"><Icon name="back" size={16} />Back to the job</a>
	<p class="eyebrow mono"><Icon name="sparkles" size={14} />Apply with Unplugged</p>
	<h1 class="title">{l.title}</h1>
	<p class="sub mono">
		{[jobCategory(l.job_category)?.label, place(l), formatPay(l)].filter(Boolean).join(' · ')}
	</p>

	{#if data.previous}
		<p class="notice">
			You already applied {timeAgo(data.previous.created_at)}. You can send another message, but don't overdo it.
		</p>
	{/if}

	{#if sent}
		<div class="done card">
			<div class="done-icon"><Icon name="check" size={30} stroke={2.4} /></div>
			<h2 class="display">Application sent</h2>
			<p class="muted">
				Sent from your Gmail to <strong>{form && 'to' in form ? form.to : ''}</strong> with your CV attached. You'll find it in your Sent folder, and their reply will come straight to your inbox.
			</p>
			<div class="row">
				<a class="btn" href="/me/applications">My applications</a>
				<a class="btn primary" href="/jobs">More jobs</a>
			</div>
		</div>
	{:else if !ready}
		<div class="card gate">
			<span class="section-label"><Icon name="user" size={15} />One-time setup</span>
			<p>To write your application we need {data.missing.join(', ')}. It takes about 3 minutes, and you'll never be asked again.</p>
			<a class="btn primary block" href="/me/profile?next=/apply/{l.id}">Complete my profile</a>
		</div>
	{:else}
		<!-- 1. CV -->
		<div class="step card">
			<h2 class="section-label"><span class="n">1</span>Choose your CV</h2>
			{#if data.cvs.length}
				<div class="cvs">
					{#each data.cvs as c (c.id)}
						<label class="cv" class:on={cvId === c.id}>
							<input type="radio" name="cv" value={c.id} bind:group={cvId} />
							<Icon name="file" size={20} />
							<span>
								<strong>{c.label}</strong>
								{#if c.id === data.suggestedCv && data.cvs.length > 1}<small class="mono">Best match</small>{/if}
							</span>
						</label>
					{/each}
				</div>
				{#if data.cvs.length < 3}<a class="small-link" href="/me/cvs">+ Upload another CV</a>{/if}
			{:else}
				<p class="muted">You haven't uploaded a CV yet.</p>
				<a class="btn small" href="/me/cvs"><Icon name="upload" size={16} />Upload a CV</a>
			{/if}
		</div>

		<!-- 2. Write -->
		<div class="step card">
			<h2 class="section-label"><span class="n">2</span>Your {isEmail ? 'email' : 'message'}</h2>
			{#if !draft}
				<p class="muted">
					We'll write a {isEmail ? 'professional email' : 'short message'} from your profile, matched to this job.
					You can edit everything before sending.
				</p>
				<form
					method="POST"
					action="?/draft"
					use:enhance={() => {
						writing = true;
						return async ({ result }) => {
							writing = false;
							if (result.type === 'success' && result.data?.draft) {
								draft = result.data.draft as Draft;
								source = result.data.source as 'ai' | 'template';
								notice = (result.data.notice as string) ?? null;
								subject = draft.subject;
								body = draft.email;
								message = draft.message;
							} else if (result.type === 'failure') {
								notice = (result.data?.message as string) ?? 'Something went wrong.';
							}
						};
					}}
				>
					<button class="btn primary block write" disabled={writing}>
						<Icon name="sparkles" size={18} />{writing ? 'Writing your application…' : 'Write it for me'}
					</button>
				</form>
				{#if data.aiReady}
					<p class="muted tiny">
						Your profile (not your phone, email or CV) is sent to Google's Gemini AI to write the text.
						<a href="/privacy#ai">More</a>
					</p>
				{/if}
				{#if notice}<p class="notice error">{notice}</p>{/if}
			{:else}
				{#if source === 'ai'}<p class="ai-tag mono"><Icon name="sparkles" size={13} />Written by AI from your profile — check it</p>{/if}
				{#if notice}<p class="notice">{notice}</p>{/if}
				{#if isEmail}
					<label class="field"><span>Subject</span><input bind:value={subject} /></label>
					<label class="field"><span>Email</span><textarea bind:value={body} rows="14"></textarea></label>
				{:else}
					<label class="field"><span>Message</span><textarea bind:value={message} rows="7"></textarea></label>
				{/if}
				{#if draft.notes.length}
					<ul class="notes">
						{#each draft.notes as n}<li>{n}</li>{/each}
					</ul>
				{/if}
			{/if}
		</div>

		<!-- 3. Send -->
		{#if draft}
			<div class="step card">
				<h2 class="section-label"><span class="n">3</span>Send</h2>

				{#if data.channel === 'email'}
					{#if data.gmailReady}
						<p class="muted small">
							To <strong>{data.recipient}</strong> · from your Gmail ({data.me?.email}) ·
							{cv ? `attached: ${cv.label}` : 'no CV selected'}
						</p>
						{#if data.gmailConnected && !needsReconnect}
							<form
								method="POST"
								action="?/send"
								use:enhance={() => {
									sending = true;
									return async ({ update }) => {
										await update({ reset: false });
										sending = false;
									};
								}}
							>
								<input type="hidden" name="subject" value={subject} />
								<input type="hidden" name="body" value={body} />
								<input type="hidden" name="cv_id" value={cvId ?? ''} />
								<button class="btn primary block" disabled={sending || !cv}>
									<Icon name="send" size={18} />{sending ? 'Sending…' : 'Send from my Gmail'}
								</button>
							</form>
						{:else}
							<button class="btn primary block" onclick={connectGmail} disabled={!cv}>
								<Icon name="mail" size={18} />Connect Gmail & send
							</button>
							<p class="muted tiny">
								Google will ask you to let Unplugged <strong>send</strong> emails for you — we can't read your inbox. Then
								you're back here with everything ready.
							</p>
						{/if}
						{#if gmailDenied}<p class="notice error">Gmail wasn't connected. Try again, or use your email app below.</p>{/if}
						{#if form && 'message' in form && form.message}<p class="notice error">{form.message}</p>{/if}
						<details class="alt">
							<summary class="mono">Send from my email app instead</summary>
							{@render ownEmail()}
						</details>
					{:else}
						{@render ownEmail()}
					{/if}
				{:else if data.channel === 'phone'}
					<p class="muted small">This employer asked to be contacted on <strong>{data.phone}</strong>.</p>
					<div class="grid2">
						<button class="btn primary" onclick={openWhatsApp}><Icon name="chat" size={18} />WhatsApp</button>
						<button class="btn" onclick={openSms}><Icon name="phone" size={18} />SMS</button>
					</div>
					{#if cv}
						<button class="btn block ghost" onclick={() => shareCv(message)}><Icon name="file" size={18} />Then send my CV ({cv.label})</button>
						<p class="muted tiny">WhatsApp can't attach files from a link: send the message, then tap here and pick the same chat.</p>
					{/if}
				{:else if data.channel === 'link'}
					<div class="grid2">
						<button class="btn" onclick={() => copy(body)}><Icon name={copied ? 'check' : 'copy'} size={18} />{copied ? 'Copied' : 'Copy cover letter'}</button>
						<a class="btn primary" href={data.applyUrl} target="_blank" rel="noopener nofollow" onclick={() => log('link', body)}
							><Icon name="link" size={18} />Open apply page</a
						>
					</div>
					<p class="muted tiny">Paste the cover letter in their form and upload your CV there.</p>
				{:else}
					<p class="muted">There's no contact on this listing yet — copy your text and check the original post.</p>
					<button class="btn" onclick={() => { copy(isEmail ? body : message); log('manual', message); }}>
						<Icon name="copy" size={18} />{copied ? 'Copied' : 'Copy text'}
					</button>
				{/if}

				{#if logged}<p class="notice ok">Saved in <a href="/me/applications">My applications</a>.</p>{/if}
			</div>
		{/if}
	{/if}
</section>

{#snippet ownEmail()}
	<div class="own">
		<p class="muted small">Opens your email app with everything filled in — attach your CV before sending.</p>
		<div class="grid2">
			<button class="btn primary" onclick={openMail}><Icon name="mail" size={18} />Open email app</button>
			{#if cv}<button class="btn" onclick={() => shareCv(`${subject}\n\n${body}`)}><Icon name="file" size={18} />Share CV</button>{/if}
		</div>
	</div>
{/snippet}

<style>
	.page {
		padding-top: 16px;
		display: grid;
		gap: 14px;
	}
	.back {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: 13px;
		color: var(--muted);
		text-decoration: none;
	}
	.eyebrow {
		display: flex;
		align-items: center;
		gap: 6px;
		margin: 6px 0 -8px;
		font-size: 12px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--gold);
	}
	.title {
		font-size: 28px;
		font-weight: 600;
		margin: 0;
	}
	.sub {
		margin: -8px 0 0;
		font-size: 13px;
		color: var(--muted);
	}
	.step {
		display: grid;
		gap: 12px;
	}
	.step h2 {
		margin: 0;
	}
	.n {
		display: inline-grid;
		place-items: center;
		width: 22px;
		height: 22px;
		border-radius: 50%;
		background: var(--gold);
		color: #1a1208;
		font-size: 12px;
	}
	.cvs {
		display: grid;
		gap: 8px;
	}
	.cv {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 14px;
		border-radius: 14px;
		border: 1px solid var(--line);
		background: var(--surface);
		cursor: pointer;
	}
	.cv.on {
		border-color: var(--gold);
		background: var(--gold-soft);
	}
	.cv input {
		width: auto;
		min-height: 0;
		accent-color: var(--gold);
	}
	.cv span {
		display: grid;
	}
	.cv small {
		font-size: 11px;
		color: var(--gold);
	}
	.small-link {
		font-size: 14px;
	}
	.write {
		min-height: 52px;
	}
	.ai-tag {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		margin: 0;
		font-size: 12px;
		color: var(--gold);
	}
	textarea {
		font-size: 15px;
		line-height: 1.55;
	}
	.notes {
		margin: 0;
		padding: 12px 14px 12px 30px;
		border-radius: 12px;
		background: #1c160e;
		border: 1px solid #4a3b26;
		font-size: 14px;
	}
	.grid2 {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
	}
	.small {
		font-size: 13px;
		margin: 0;
	}
	.tiny {
		font-size: 12px;
		margin: 0;
	}
	.alt summary {
		cursor: pointer;
		font-size: 13px;
		color: var(--muted);
	}
	.own {
		display: grid;
		gap: 10px;
		margin-top: 10px;
	}
	.gate {
		display: grid;
		gap: 10px;
	}
	.gate p {
		margin: 0;
	}
	.done {
		display: grid;
		justify-items: center;
		text-align: center;
		gap: 8px;
		padding: 28px 18px;
	}
	.done-icon {
		display: grid;
		place-items: center;
		width: 64px;
		height: 64px;
		border-radius: 50%;
		background: var(--gold);
		color: #1a1208;
	}
	.done h2 {
		font-size: 30px;
		margin: 4px 0 0;
	}
	.done p {
		margin: 0;
	}
	.row {
		display: flex;
		gap: 10px;
		margin-top: 8px;
	}
</style>
