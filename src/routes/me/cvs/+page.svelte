<script lang="ts">
	import { enhance } from '$app/forms';
	import Icon from '$lib/components/Icon.svelte';
	import { JOB_CATEGORIES, jobCategory } from '$lib/constants';

	let { data, form } = $props();
	let uploading = $state(false);
	let fileName = $state('');
	const kb = (n: number | null) => (n ? `${Math.round(n / 1024)} KB` : '');
</script>

<svelte:head><title>My CVs · Unplugged Board</title></svelte:head>

<section class="wrap page">
	<a class="mono back" href="/me"><Icon name="back" size={16} />Me</a>
	<h1 class="page-title">My CVs</h1>
	<p class="muted">
		Keep up to 3 versions — e.g. one for hospitality, one for construction. When you apply, we suggest the
		best one for that job and attach it for you.
	</p>

	{#each data.cvs as cv (cv.id)}
		<div class="cv card">
			<span class="cv-icon"><Icon name="file" size={22} /></span>
			<div class="cv-info">
				<strong>{cv.label}</strong>
				<span class="muted mono small">{cv.file_name} · {kb(cv.size_bytes)}</span>
				{#if cv.categories.length}
					<span class="cats">{cv.categories.map((c) => jobCategory(c)?.label).filter(Boolean).join(' · ')}</span>
				{/if}
			</div>
			<div class="cv-actions">
				<a class="icon-btn" href="/me/cvs/{cv.id}" target="_blank" aria-label="Open {cv.label}"><Icon name="share" size={16} /></a>
				<form method="POST" action="?/delete" use:enhance>
					<input type="hidden" name="id" value={cv.id} />
					<button class="icon-btn" aria-label="Delete {cv.label}" onclick={(e) => !confirm(`Delete "${cv.label}"?`) && e.preventDefault()}>
						<Icon name="trash" size={16} />
					</button>
				</form>
			</div>
		</div>
	{/each}

	{#if data.cvs.length < 3}
		<form
			class="upload card"
			method="POST"
			action="?/upload"
			enctype="multipart/form-data"
			use:enhance={() => {
				uploading = true;
				return async ({ update }) => {
					await update();
					uploading = false;
					fileName = '';
				};
			}}
		>
			<h2 class="section-label"><Icon name="upload" size={15} />Add a CV</h2>
			<label class="drop">
				<input
					name="file"
					type="file"
					accept="application/pdf,.pdf,.doc,.docx"
					required
					onchange={(e) => (fileName = e.currentTarget.files?.[0]?.name ?? '')}
				/>
				<Icon name="file" size={26} />
				<span>{fileName || 'Choose a PDF (max 2 MB)'}</span>
			</label>
			<label class="field"><span>Name</span><input name="label" required maxlength="60" placeholder="e.g. Hospitality CV" /></label>
			<div class="field">
				<span>Best for (optional)</span>
				<div class="chips-pick">
					{#each JOB_CATEGORIES as c}
						<label class="choice"><input type="checkbox" name="categories" value={c.id} /><span>{c.label}</span></label>
					{/each}
				</div>
			</div>
			{#if form?.message}<p class="notice error">{form.message}</p>{/if}
			{#if form?.uploaded}<p class="notice ok">"{form.uploaded}" uploaded.</p>{/if}
			<button class="btn primary" disabled={uploading}>{uploading ? 'Uploading…' : 'Upload CV'}</button>
		</form>
	{:else}
		<p class="notice">You have 3 CVs — delete one to add another.</p>
	{/if}

	<p class="muted small">
		Your CVs are private: only you can open them. They're sent to an employer only when you apply.
	</p>
</section>

<style>
	.page {
		padding-top: 16px;
		display: grid;
		gap: 14px;
	}
	.page > p {
		margin: 0;
	}
	.back {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: 13px;
		color: var(--muted);
		text-decoration: none;
	}
	.cv {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.cv-icon {
		display: grid;
		place-items: center;
		flex: none;
		width: 44px;
		height: 52px;
		border-radius: 8px;
		background: var(--gold-soft);
		color: var(--gold);
	}
	.cv-info {
		flex: 1;
		min-width: 0;
		display: grid;
		gap: 2px;
	}
	.cv-info .small {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.cats {
		font-size: 12px;
		color: var(--gold);
	}
	.cv-actions {
		display: flex;
		gap: 6px;
	}
	.cv-actions form {
		margin: 0;
	}
	.upload {
		display: grid;
		gap: 14px;
	}
	.upload h2 {
		margin: 0;
	}
	.drop {
		position: relative;
		display: grid;
		justify-items: center;
		gap: 8px;
		padding: 24px 12px;
		border-radius: 14px;
		border: 1.5px dashed #4a3b26;
		background: var(--gold-soft);
		color: var(--gold);
		text-align: center;
		cursor: pointer;
	}
	.drop span {
		color: var(--cream);
		font-size: 14px;
		overflow-wrap: anywhere;
	}
	.drop input {
		position: absolute;
		inset: 0;
		opacity: 0;
		cursor: pointer;
	}
	.chips-pick {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.small {
		font-size: 12px;
	}
</style>
