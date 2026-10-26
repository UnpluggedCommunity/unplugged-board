<script lang="ts">
	import { enhance } from '$app/forms';
	import Icon from '$lib/components/Icon.svelte';
	import { JOB_CATEGORIES } from '$lib/constants';
	import {
		COMMON_TICKETS,
		EMPTY_EXPERIENCE,
		ENGLISH_LEVELS,
		GOALS,
		LICENCES,
		VISA_TYPES,
		type Experience
	} from '$lib/profile';

	let { data, form } = $props();
	// svelte-ignore state_referenced_locally — the form owns its values after load
	const p = data.profile;

	const STEPS = ['About you', 'Visa & goals', 'Licence & tickets', 'Experience', 'Extra'];
	let step = $state(0);
	let saving = $state(false);
	let experience = $state<Experience[]>(p.experience.length ? p.experience : [{ ...EMPTY_EXPERIENCE }]);
	const otherTickets = p.tickets.filter((t) => !COMMON_TICKETS.includes(t)).join(', ');
	const bool = (v: boolean | null) => (v === true ? 'yes' : v === false ? 'no' : '');

	function go(to: number) {
		step = Math.max(0, Math.min(STEPS.length - 1, to));
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}
</script>

<svelte:head><title>Job profile · Unplugged Board</title></svelte:head>

<section class="wrap page">
	<a class="mono back" href="/me"><Icon name="back" size={16} />Me</a>
	<h1 class="page-title">Job profile</h1>
	<p class="muted intro">
		{data.isNew ? 'Answer once' : 'Update any time'} — every application the AI writes for you uses only these
		facts. Nothing is shared with anyone until you press send.
	</p>

	<ol class="steps" aria-label="Steps">
		{#each STEPS as s, i}
			<li class:on={i === step} class:done={i < step}>
				<button type="button" onclick={() => go(i)} aria-current={i === step ? 'step' : undefined}>
					<span class="num mono">{i < step ? '✓' : i + 1}</span>
					<span class="lbl">{s}</span>
				</button>
			</li>
		{/each}
	</ol>

	<form
		method="POST"
		use:enhance={() => {
			saving = true;
			return async ({ update }) => {
				await update({ reset: false });
				saving = false;
			};
		}}
	>
		<input type="hidden" name="next" value={data.next} />

		<!-- 1. About you -->
		<fieldset class="pane" class:show={step === 0}>
			<legend class="section-label">1 · About you</legend>
			<label class="field"><span>Full name *</span><input name="full_name" value={p.full_name ?? ''} autocomplete="name" /></label>
			<label class="field"><span>Phone</span><input name="phone" type="tel" value={p.phone ?? ''} autocomplete="tel" placeholder="04xx xxx xxx" /></label>
			<label class="field"><span>Email for employers' replies</span><input name="email" type="email" value={p.email ?? ''} autocomplete="email" /></label>
			<label class="field"><span>Where do you live now?</span><input name="suburb" value={p.suburb ?? ''} placeholder="e.g. Scarborough, Perth" /></label>
		</fieldset>

		<!-- 2. Visa & goals -->
		<fieldset class="pane" class:show={step === 1}>
			<legend class="section-label">2 · Visa & goals</legend>
			<label class="field">
				<span>Visa</span>
				<select name="visa_type" value={p.visa_type ?? ''}>
					<option value="">Choose…</option>
					{#each VISA_TYPES as v}<option value={v.id}>{v.label}</option>{/each}
				</select>
			</label>
			<div class="two">
				<label class="field"><span>Visa valid until</span><input name="visa_expiry" type="date" value={p.visa_expiry ?? ''} /></label>
				<label class="field"><span>Available from</span><input name="available_from" type="date" value={p.available_from ?? ''} /></label>
			</div>
			<div class="field">
				<span>What are you looking for?</span>
				<div class="chips-pick">
					{#each GOALS as g}
						<label class="choice"><input type="radio" name="goal" value={g.id} checked={p.goal === g.id} /><span>{g.label}</span></label>
					{/each}
				</div>
			</div>
			<div class="field">
				<span>Jobs you're interested in</span>
				<div class="chips-pick">
					{#each JOB_CATEGORIES as c}
						<label class="choice"
							><input type="checkbox" name="wanted_categories" value={c.id} checked={p.wanted_categories.includes(c.id)} /><span
								>{c.label}</span
							></label
						>
					{/each}
				</div>
			</div>
		</fieldset>

		<!-- 3. Licence & tickets -->
		<fieldset class="pane" class:show={step === 2}>
			<legend class="section-label">3 · Licence & tickets</legend>
			<label class="field">
				<span>Driver licence</span>
				<select name="licence" value={p.licence ?? ''}>
					<option value="">Choose…</option>
					{#each LICENCES as l}<option value={l.id}>{l.label}</option>{/each}
				</select>
			</label>
			<div class="two">
				<div class="field">
					<span>Own car?</span>
					<div class="chips-pick">
						<label class="choice"><input type="radio" name="own_car" value="yes" checked={bool(p.own_car) === 'yes'} /><span>Yes</span></label>
						<label class="choice"><input type="radio" name="own_car" value="no" checked={bool(p.own_car) === 'no'} /><span>No</span></label>
					</div>
				</div>
				<div class="field">
					<span>Happy to relocate?</span>
					<div class="chips-pick">
						<label class="choice"><input type="radio" name="relocate" value="yes" checked={bool(p.relocate) === 'yes'} /><span>Yes</span></label>
						<label class="choice"><input type="radio" name="relocate" value="no" checked={bool(p.relocate) === 'no'} /><span>No</span></label>
					</div>
				</div>
			</div>
			<div class="field">
				<span>Tickets & licences you have</span>
				<div class="chips-pick">
					{#each COMMON_TICKETS as t}
						<label class="choice"><input type="checkbox" name="tickets" value={t} checked={p.tickets.includes(t)} /><span>{t}</span></label>
					{/each}
				</div>
			</div>
			<label class="field"><span>Other tickets</span><input name="tickets_other" value={otherTickets} placeholder="Comma separated, e.g. Gas Test Atmospheres" /></label>
			<label class="field"><span>Tickets or courses you plan to get</span><input name="planned_tickets" value={p.planned_tickets.join(', ')} placeholder="e.g. First Aid, EWP" /></label>
		</fieldset>

		<!-- 4. Experience -->
		<fieldset class="pane" class:show={step === 3}>
			<legend class="section-label">4 · Experience</legend>
			<p class="muted small">Most recent first. Add the jobs that matter — in Australia or back home.</p>
			{#each experience as e, i (i)}
				<div class="exp card">
					<div class="exp-head">
						<span class="mono small muted">Job {i + 1}</span>
						{#if experience.length > 1}
							<button type="button" class="icon-btn" aria-label="Remove job {i + 1}" onclick={() => experience.splice(i, 1)}><Icon name="trash" size={16} /></button>
						{/if}
					</div>
					<label class="field"><span>Role</span><input name="exp_role" bind:value={e.role} placeholder="e.g. Barista, Farmhand, Labourer" /></label>
					<div class="two">
						<label class="field"><span>Company</span><input name="exp_company" bind:value={e.company} /></label>
						<label class="field"><span>Where</span><input name="exp_place" bind:value={e.place} placeholder="e.g. Fremantle WA" /></label>
					</div>
					<label class="field"><span>When</span><input name="exp_dates" bind:value={e.dates} placeholder="e.g. Jan–Apr 2026" /></label>
					<label class="field"><span>What you did</span><textarea name="exp_details" bind:value={e.details} rows="3" placeholder="Main tasks, machines, results — short and concrete"></textarea></label>
				</div>
			{/each}
			{#if experience.length < 12}
				<button type="button" class="btn ghost" onclick={() => experience.push({ ...EMPTY_EXPERIENCE })}><Icon name="plus" size={16} />Add another job</button>
			{/if}
		</fieldset>

		<!-- 5. Extra -->
		<fieldset class="pane" class:show={step === 4}>
			<legend class="section-label">5 · Extra</legend>
			<div class="field">
				<span>English</span>
				<div class="chips-pick">
					{#each ENGLISH_LEVELS as l}
						<label class="choice"><input type="radio" name="english_level" value={l.id} checked={p.english_level === l.id} /><span>{l.label}</span></label>
					{/each}
				</div>
			</div>
			<label class="field"><span>Other languages</span><input name="languages" value={p.languages ?? ''} placeholder="e.g. Italian (native), Spanish" /></label>
			<label class="field"><span>Education</span><input name="education" value={p.education ?? ''} placeholder="e.g. Bachelor in Business, Italy (2022)" /></label>
			<label class="field">
				<span>Your strengths, in your words</span>
				<textarea name="strengths" rows="3" placeholder="e.g. I learn fast, I'm always on time, I was promoted to team leader…">{p.strengths ?? ''}</textarea>
			</label>
			<label class="field">
				<span>Anything else an employer should know?</span>
				<textarea name="about" rows="3" placeholder="e.g. I want to settle in WA long term and start a trade next year">{p.about ?? ''}</textarea>
			</label>
		</fieldset>

		{#if form?.message}<p class="notice error">{form.message}</p>{/if}

		<div class="nav">
			{#if step > 0}<button type="button" class="btn ghost" onclick={() => go(step - 1)}>Back</button>{/if}
			{#if step < STEPS.length - 1}
				<button type="button" class="btn primary grow" onclick={() => go(step + 1)}>Next<Icon name="next" size={16} /></button>
			{/if}
			<button type="submit" class="btn grow" class:primary={step === STEPS.length - 1} disabled={saving}>
				{saving ? 'Saving…' : step === STEPS.length - 1 ? 'Save profile' : 'Save'}
			</button>
		</div>
	</form>
</section>

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
	.intro {
		margin: 0;
	}
	.steps {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 6px;
	}
	.steps button {
		width: 100%;
		display: grid;
		justify-items: center;
		gap: 6px;
		padding: 0;
		border: 0;
		background: none;
		color: var(--muted);
		cursor: pointer;
	}
	.num {
		display: grid;
		place-items: center;
		width: 30px;
		height: 30px;
		border-radius: 50%;
		border: 1px solid var(--line);
		font-size: 13px;
	}
	.lbl {
		font-size: 10.5px;
		line-height: 1.2;
		text-align: center;
	}
	.on .num {
		background: var(--gold);
		border-color: var(--gold);
		color: #1a1208;
		font-weight: 600;
	}
	.on .lbl {
		color: var(--cream);
	}
	.done .num {
		border-color: #4a3b26;
		color: var(--gold);
	}
	form {
		display: grid;
		gap: 16px;
	}
	.pane {
		display: none;
		gap: 16px;
		border: 0;
		margin: 0;
		padding: 0;
		min-width: 0;
	}
	.pane.show {
		display: grid;
	}
	legend {
		padding: 0;
	}
	.two {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
	}
	@media (max-width: 400px) {
		.two {
			grid-template-columns: 1fr;
		}
	}
	.field > span:first-child {
		font: 500 12px/1.2 var(--font-mono);
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--muted);
	}
	.chips-pick {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.exp {
		display: grid;
		gap: 12px;
	}
	.exp-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		min-height: 40px;
	}
	.small {
		font-size: 13px;
		margin: 0;
	}
	.nav {
		position: sticky;
		bottom: calc(var(--nav-h) + env(safe-area-inset-bottom));
		display: flex;
		gap: 10px;
		padding: 12px 0;
		background: linear-gradient(transparent, var(--bg) 30%);
	}
	.grow {
		flex: 1;
	}
</style>
