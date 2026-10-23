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
	import ShareButtons from './ShareButtons.svelte';

	let {
		data,
		form
	}: {
		data: {
			listing: Listing;
			contact: ListingPrivate | null;
			canSeeContacts: boolean;
			origin: string;
			me: App.Me | null;
		};
		form: { removalSent?: boolean; removalError?: string } | null;
	} = $props();

	const l = $derived(data.listing);
	const yesNo = (v: boolean | null) => (v === true ? 'Yes' : v === false ? 'No' : null);
	const live = $derived(l.status === 'published' && !!l.expires_at && new Date(l.expires_at) > new Date());

	const rows = $derived(
		(l.type === 'job'
			? [
					['Pay', formatPay(l)],
					['Category', jobCategory(l.job_category)?.label],
					['Employment', labelOf(EMPLOYMENT_TYPES, l.employment_type)],
					['Start', startText(l)?.replace(/^Start /, '')],
					['Hours / roster', l.hours_text],
					['Tickets', l.req_tickets.join(', ') || null],
					['Own car', yesNo(l.req_own_car)],
					['Experience', l.req_experience],
					['English', l.req_english],
					['Accommodation', l.accommodation_text || yesNo(l.accommodation_provided)]
				]
			: [
					['Rent', formatRent(l) && formatRent(l) + (l.rent_from_month ? ' (converted from monthly)' : '')],
					['Bond', l.bond != null ? `$${l.bond}` : null],
					['Bills', labelOf(BILLS, l.bills)],
					['Room', labelOf(ROOM_TYPES, l.room_type)],
					['Furnished', yesNo(l.furnished)],
					['Available', formatDay(l.available_from)],
					['Minimum stay', l.min_stay],
					['Couples', yesNo(l.couples_ok)],
					['Gender preference', l.gender_pref],
					['Parking', l.parking],
					['Transport', l.transport]
				]
		).concat([
			['Zone', [l.suburb, zoneLabel(l.zone)].filter(Boolean).join(' · ') || null]
		]) as [string, string | null | undefined][]
	);
	const title = $derived(`${l.title}${place(l) && !l.title.includes(place(l)!) ? ' — ' + place(l) : ''}`);
	const ogImage = $derived(l.og_image || `${data.origin}/og-default.png`);
	const next = $derived(encodeURIComponent(page.url.pathname));
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

<article class="wrap detail">
	<a class="back mono" href={l.type === 'job' ? '/jobs' : '/rooms'}>← All {l.type === 'job' ? 'jobs' : 'rooms'}</a>

	{#if !live}
		<p class="notice">This listing is not live (status: {l.status}). Only staff and the owner can see it.</p>
	{/if}

	<div class="badges">
		{#if isNew(l)}<span class="badge new">New</span>{/if}
		{#if l.type === 'job' && jobCategory(l.job_category)}<span class="badge">{jobCategory(l.job_category)?.label}</span>{/if}
		{#if l.type === 'job' && l.whv_417 === 'likely'}<span class="badge whv">417 likely eligible</span>{/if}
	</div>
	<h1 class="title">{l.title}</h1>
	<div class="chips">
		{#if formatPrice(l)}<span class="chip money">💰 {formatPrice(l)}</span>{/if}
		{#if place(l)}<span class="chip">📍 {place(l)}</span>{/if}
		{#if startText(l)}<span class="chip">📅 {startText(l)}</span>{/if}
	</div>
	<p class="label posted">
		Posted {timeAgo(l.posted_at ?? l.published_at)}
		{#if l.expires_at}· expires {formatDay(l.expires_at)}{/if}
	</p>

	{#if l.photos.length}
		<div class="photos">
			{#each l.photos as src, i}
				<img {src} alt="Photo {i + 1} of {l.title}" loading={i ? 'lazy' : 'eager'} />
			{/each}
		</div>
	{/if}

	{#if l.summary}<p class="summary">{l.summary}</p>{/if}

	<section class="contact card">
		{#if data.canSeeContacts}
			<h2 class="label">Contact</h2>
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
						<a class="btn primary" href={data.contact.apply_url} target="_blank" rel="noopener nofollow">Apply via link</a>
					{/if}
					{#if data.contact.original_url}
						<a class="btn" href={data.contact.original_url} target="_blank" rel="noopener nofollow">Original post ↗</a>
					{/if}
				</div>
			{:else}
				<p class="muted">No contact details were given in the original post.</p>
			{/if}
		{:else}
			<h2 class="display join-title">Contacts are for Unplugged members</h2>
			<p>
				Join the Unplugged community on WhatsApp, then log in and enter the
				<strong>Community Access Code</strong> shared in the groups.
			</p>
			{#if data.me}
				<a class="btn primary block" href="/join?next={next}">Enter the access code</a>
			{:else}
				<a class="btn primary block" href="/login?next={next}">Log in with Google</a>
			{/if}
		{/if}
	</section>

	<dl class="facts">
		{#each rows.filter(([, v]) => v) as [k, v]}
			<div><dt class="label">{k}</dt><dd>{v}</dd></div>
		{/each}
	</dl>

	{#if l.type === 'job' && l.whv_417 !== 'unknown'}
		<p class="notice whv-note">
			<strong>WHV 417 specified work: {labelOf(WHV_417, l.whv_417)}.</strong>
			Always verify on the official
			<a href={WHV_SPECIFIED_WORK_URL} target="_blank" rel="noopener">Home Affairs website</a>.
		</p>
	{/if}

	<div class="share-row">
		<ShareButtons listing={l} origin={data.origin} />
		{#if data.me?.isStaff}<a class="btn small ghost" href="/staff/edit/{l.id}">Edit</a>{/if}
	</div>

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
</article>

<style>
	.detail {
		padding-top: 16px;
		padding-bottom: 24px;
		display: grid;
		gap: 14px;
	}
	.back {
		font-size: 13px;
		color: var(--muted);
		text-decoration: none;
	}
	.badges {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.badges:empty {
		display: none;
	}
	.title {
		font-size: 28px;
		font-weight: 600;
		margin: 0;
		overflow-wrap: anywhere;
	}
	.posted {
		margin: 0;
	}
	.photos {
		display: flex;
		gap: 8px;
		overflow-x: auto;
		scroll-snap-type: x mandatory;
		margin: 0 calc(-1 * var(--gutter));
		padding: 0 var(--gutter);
	}
	.photos img {
		flex: none;
		width: 85%;
		max-width: 520px;
		aspect-ratio: 4 / 3;
		object-fit: cover;
		border-radius: 12px;
		scroll-snap-align: center;
	}
	.summary {
		font-size: 17px;
		margin: 0;
	}
	.contact {
		border-color: #4a3b26;
	}
	.contact h2.label {
		margin: 0 0 8px;
	}
	.join-title {
		font-size: 22px;
		color: var(--gold);
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
	.facts {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
		gap: 12px;
		margin: 0;
	}
	.facts dd {
		margin: 2px 0 0;
	}
	.share-row {
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
</style>
