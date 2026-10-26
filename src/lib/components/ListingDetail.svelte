<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import {
		BILLS,
		EMPLOYMENT_TYPES,
		ROOM_TYPES,
		WHV_417,
		WHV_SPECIFIED_WORK_URL,
		jobCategory,
		zoneLabel
	} from '$lib/constants';
	import {
		formatDay,
		formatPay,
		formatPrice,
		formatRent,
		isNew,
		labelOf,
		metaDescription,
		place,
		startText,
		timeAgo,
		type Listing,
		type ListingPrivate
	} from '$lib/format';
	import Icon, { type IconName } from './Icon.svelte';
	import SaveButton from './SaveButton.svelte';
	import ShareButtons from './ShareButtons.svelte';

	let {
		data,
		form
	}: {
		data: {
			listing: Listing;
			contact: ListingPrivate | null;
			canSeeContacts: boolean;
			saved: boolean;
			origin: string;
			me: App.Me | null;
		};
		form: { removalSent?: boolean; removalError?: string } | null;
	} = $props();

	const l = $derived(data.listing);
	const isJob = $derived(l.type === 'job');
	const yesNo = (v: boolean | null) => (v === true ? 'Yes' : v === false ? 'No' : null);
	const live = $derived(l.status === 'published' && !!l.expires_at && new Date(l.expires_at) > new Date());

	const rows = $derived(
		(isJob
			? [
					['briefcase', 'Employment', labelOf(EMPLOYMENT_TYPES, l.employment_type)],
					['calendar', 'Start', startText(l)?.replace(/^Start /, '')],
					['clock', 'Hours / roster', l.hours_text],
					['ticket', 'Tickets', l.req_tickets.join(', ') || null],
					['car', 'Own car', yesNo(l.req_own_car)],
					['star', 'Experience', l.req_experience],
					['globe', 'English', l.req_english],
					['home', 'Accommodation', l.accommodation_text || yesNo(l.accommodation_provided)]
				]
			: [
					['bed', 'Room', labelOf(ROOM_TYPES, l.room_type)],
					['shield', 'Bond', l.bond != null ? `$${l.bond}` : null],
					['bolt', 'Bills', labelOf(BILLS, l.bills)],
					['home', 'Furnished', yesNo(l.furnished)],
					['calendar', 'Available', formatDay(l.available_from)],
					['clock', 'Minimum stay', l.min_stay],
					['user', 'Couples', yesNo(l.couples_ok)],
					['user', 'Gender preference', l.gender_pref],
					['car', 'Parking', l.parking],
					['pin', 'Transport', l.transport]
				]
		).filter(([, , v]) => v) as [IconName, string, string][]
	);
	const where = $derived([l.suburb, zoneLabel(l.zone)].filter(Boolean).join(' · '));
	const title = $derived(`${l.title}${place(l) && !l.title.includes(place(l)!) ? ' — ' + place(l) : ''}`);
	const ogImage = $derived(l.og_image || `${data.origin}/og-default.png`);
	const next = $derived(encodeURIComponent(page.url.pathname));
	const canApply = $derived(isJob && live);
</script>

<svelte:head>
	<title>{title} · Unplugged Board</title>
	<meta name="description" content={metaDescription(l)} />
	<meta property="og:type" content="article" />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={metaDescription(l)} />
	<meta property="og:url" content={`${data.origin}${page.url.pathname}`} />
	<meta property="og:image" content={ogImage} />
	<meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<article class="detail">
	<div class="wrap head">
		<a class="back" href={isJob ? '/jobs' : '/rooms'} aria-label="Back to {isJob ? 'jobs' : 'rooms'}"><Icon name="back" size={20} /></a>
		<div class="head-actions">
			<ShareButtons listing={l} origin={data.origin} compact />
		</div>
	</div>

	{#if l.photos.length}
		<div class="photos">
			{#each l.photos as src, i}
				<img {src} alt="Photo {i + 1} of {l.title}" loading={i ? 'lazy' : 'eager'} />
			{/each}
		</div>
	{/if}

	<div class="wrap body">
		{#if !live}
			<p class="notice">This listing is not live (status: {l.status}). Only staff and the owner can see it.</p>
		{/if}

		<p class="kicker mono">
			{isJob ? (jobCategory(l.job_category)?.label ?? 'Job') : 'Room'}
			{#if isNew(l)}<b class="new">New</b>{/if}
			<span class="muted">· {timeAgo(l.posted_at ?? l.published_at)}</span>
		</p>
		<h1 class="title">{l.title}</h1>
		{#if formatPrice(l)}
			<p class="price mono">
				{isJob ? formatPay(l) : formatRent(l)}
				{#if l.rent_from_month}<small class="muted">converted from monthly</small>{/if}
			</p>
		{/if}
		{#if where}<p class="where"><Icon name="pin" size={16} />{where}</p>{/if}

		<div class="badges">
			{#if isJob && (l.apply_channel === 'email' || l.apply_channel === 'phone')}
				<span class="badge gold"><Icon name="bolt" size={12} filled /> Quick apply</span>
			{/if}
			{#if isJob && l.whv_417 === 'likely'}<span class="badge whv">417 likely eligible</span>{/if}
		</div>

		{#if l.summary}<p class="summary">{l.summary}</p>{/if}

		{#if rows.length}
			<dl class="facts">
				{#each rows as [icon, k, v]}
					<div class="fact">
						<span class="fact-icon"><Icon name={icon} size={17} /></span>
						<div>
							<dt>{k}</dt>
							<dd>{v}</dd>
						</div>
					</div>
				{/each}
			</dl>
		{/if}

		{#if isJob && l.whv_417 !== 'unknown'}
			<p class="notice whv-note">
				<strong>WHV 417 specified work: {labelOf(WHV_417, l.whv_417)}.</strong>
				Always verify on the official
				<a href={WHV_SPECIFIED_WORK_URL} target="_blank" rel="noopener">Home Affairs website</a>.
			</p>
		{/if}

		<section class="contact" id="contact">
			{#if data.canSeeContacts}
				<h2 class="section-label">Contact</h2>
				{#if data.contact && Object.values(data.contact).some(Boolean)}
					<dl class="contact-list">
						{#if data.contact.contact_name}<dt>Who</dt><dd>{data.contact.contact_name}</dd>{/if}
						{#if data.contact.contact_phone}
							<dt>Phone</dt>
							<dd><a href="tel:{data.contact.contact_phone.replace(/\s/g, '')}">{data.contact.contact_phone}</a></dd>
						{/if}
						{#if data.contact.contact_email}
							<dt>Email</dt><dd><a href="mailto:{data.contact.contact_email}">{data.contact.contact_email}</a></dd>
						{/if}
					</dl>
					<div class="contact-actions">
						{#if data.contact.apply_url}
							<a class="btn small" href={data.contact.apply_url} target="_blank" rel="noopener nofollow"
								><Icon name="link" size={16} />Apply link</a
							>
						{/if}
						{#if data.contact.original_url}
							<a class="btn small ghost" href={data.contact.original_url} target="_blank" rel="noopener nofollow">Original post ↗</a>
						{/if}
					</div>
				{:else}
					<p class="muted">No contact details were given in the original post.</p>
				{/if}
			{:else}
				<div class="lock"><Icon name="shield" size={22} /></div>
				<h2 class="display join-title">Contacts are for Unplugged members</h2>
				{#if data.me}
					<p>Enter the <strong>Community Access Code</strong> shared in the Unplugged WhatsApp groups.</p>
					<a class="btn primary block" href="/join?next={next}">Enter the access code</a>
				{:else}
					<p>Log in with Google to see the contact, the original post and to apply in one tap.</p>
					<a class="btn primary block" href="/login?next={next}">Log in with Google</a>
				{/if}
			{/if}
		</section>

		<details class="removal" id="removal">
			<summary class="mono">Request removal</summary>
			{#if form?.removalSent}
				<p class="notice ok">Thanks — the staff will review your request shortly.</p>
			{:else}
				<form method="POST" action="?/removal" use:enhance>
					<p class="muted">Is this about you, or is it wrong? Tell us and we'll take it down.</p>
					<label class="field"><span>Reason</span><textarea name="reason" required minlength="5" maxlength="2000"></textarea></label>
					<label class="field"><span>Your email (optional)</span><input name="email" type="email" autocomplete="email" /></label>
					<label class="sr-only" aria-hidden="true">Website<input name="website" tabindex="-1" autocomplete="off" /></label>
					{#if form?.removalError}<p class="notice error">{form.removalError}</p>{/if}
					<button class="btn" type="submit">Send request</button>
				</form>
			{/if}
		</details>

		{#if data.me?.isStaff}
			<a class="btn small ghost" href="/staff/edit/{l.id}">Edit listing</a>
		{/if}
	</div>

	<div class="actionbar">
		<div class="wrap actionbar-inner">
			<SaveButton id={l.id} saved={data.saved} label />
			{#if canApply}
				<a class="btn primary grow" href="/apply/{l.id}"><Icon name="send" size={18} />Apply with Unplugged</a>
			{:else if !isJob}
				<a class="btn primary grow" href="#contact"><Icon name="phone" size={18} />Contact</a>
			{/if}
		</div>
	</div>
</article>

<style>
	.detail {
		padding-bottom: 80px;
	}
	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-top: 12px;
		padding-bottom: 12px;
	}
	.back {
		display: grid;
		place-items: center;
		width: 40px;
		height: 40px;
		border-radius: 50%;
		border: 1px solid var(--line);
		color: var(--cream);
	}
	.photos {
		display: flex;
		gap: 8px;
		overflow-x: auto;
		scroll-snap-type: x mandatory;
		padding: 0 var(--gutter) 6px;
		max-width: var(--max);
		margin: 0 auto;
	}
	.photos img {
		flex: none;
		width: 88%;
		max-width: 560px;
		aspect-ratio: 4 / 3;
		object-fit: cover;
		border-radius: 16px;
		scroll-snap-align: center;
	}
	.body {
		display: grid;
		gap: 14px;
		padding-top: 8px;
	}
	.kicker {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
		margin: 0;
		font-size: 12px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--gold);
	}
	.new {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		color: var(--cream);
	}
	.new::before {
		content: '';
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--red);
	}
	.title {
		font-size: 30px;
		font-weight: 600;
		line-height: 1.15;
		margin: -4px 0 0;
		overflow-wrap: anywhere;
	}
	.price {
		display: flex;
		align-items: baseline;
		gap: 10px;
		margin: 0;
		font-size: 24px;
		font-weight: 600;
		color: var(--gold);
	}
	.price small {
		font-size: 12px;
		font-weight: 400;
	}
	.where {
		display: flex;
		align-items: center;
		gap: 6px;
		margin: -4px 0 0;
		color: #d8d1c5;
	}
	.where :global(.icon) {
		color: var(--muted);
	}
	.badges {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.badges:empty {
		display: none;
	}
	.summary {
		font-size: 17px;
		line-height: 1.6;
		margin: 0;
	}
	.facts {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
		margin: 0;
	}
	@media (max-width: 380px) {
		.facts {
			grid-template-columns: 1fr;
		}
	}
	.fact {
		display: flex;
		gap: 10px;
		padding: 12px;
		border-radius: 14px;
		background: var(--surface);
		border: 1px solid var(--line);
	}
	.fact-icon {
		display: grid;
		place-items: center;
		flex: none;
		width: 32px;
		height: 32px;
		border-radius: 10px;
		background: var(--gold-soft);
		color: var(--gold);
	}
	.fact dt {
		font: 500 11px/1.4 var(--font-mono);
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--muted);
	}
	.fact dd {
		margin: 2px 0 0;
		font-size: 15px;
		overflow-wrap: anywhere;
	}
	.contact {
		padding: 18px;
		border-radius: var(--radius);
		border: 1px solid #4a3b26;
		background: linear-gradient(160deg, rgba(245, 194, 122, 0.08), transparent 60%), var(--surface);
	}
	.lock {
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		border-radius: 50%;
		background: var(--gold-soft);
		color: var(--gold);
		margin-bottom: 10px;
	}
	.join-title {
		font-size: 24px;
		color: var(--cream);
	}
	.contact-list {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 6px 14px;
		margin: 0 0 12px;
	}
	.contact-list dt {
		color: var(--muted);
		font: 13px/1.6 var(--font-mono);
	}
	.contact-list dd {
		margin: 0;
		overflow-wrap: anywhere;
	}
	.contact-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.removal summary {
		cursor: pointer;
		color: var(--muted);
		font-size: 13px;
	}
	.removal form {
		display: grid;
		gap: 12px;
		margin-top: 12px;
	}
	.actionbar {
		position: fixed;
		left: 0;
		right: 0;
		bottom: calc(var(--nav-h) + env(safe-area-inset-bottom));
		z-index: 15;
		padding: 10px 0;
		background: linear-gradient(transparent, rgba(10, 10, 10, 0.96) 35%);
	}
	@media (min-width: 820px) {
		.actionbar {
			bottom: calc(var(--nav-h) + 24px);
		}
	}
	.actionbar-inner {
		display: flex;
		gap: 10px;
	}
	.grow {
		flex: 1;
	}
</style>
