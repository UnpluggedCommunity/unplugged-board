<script lang="ts">
	import { enhance } from '$app/forms';
	let { data, form } = $props();
</script>

<svelte:head><title>Admin · Unplugged Board</title></svelte:head>

<section class="wrap admin">
	<a class="mono back" href="/staff">← Staff</a>
	<h1 class="display">Admin</h1>

	<div class="card">
		<h2 class="label">Community Access Code</h2>
		<p class="muted">
			Changing it logs every member out of the contacts: they'll need the new code from the WhatsApp
			groups. Staff are not affected.
		</p>
		<form method="POST" action="?/code" use:enhance class="inline">
			<input name="code" placeholder="New code" autocomplete="off" autocapitalize="characters" class="mono" required minlength="4" />
			<button class="btn primary" onclick={(e) => !confirm('Change the code for everyone?') && e.preventDefault()}>Change</button>
		</form>
		{#if form?.codeSaved}<p class="notice ok">New code: <strong class="mono">{form.codeSaved}</strong> — share it in the WhatsApp groups.</p>{/if}
		{#if form?.codeMessage}<p class="notice error">{form.codeMessage}</p>{/if}
	</div>

	<div class="card">
		<h2 class="label">Staff</h2>
		<ul class="people">
			{#each data.staff as s}
				<li>
					<span><strong>{s.display_name ?? s.email}</strong><br /><span class="muted mono small">{s.email} · {s.role}</span></span>
					{#if s.email !== data.me?.email}
						<form method="POST" action="?/remove" use:enhance>
							<input type="hidden" name="email" value={s.email} />
							<button class="btn small danger">Remove</button>
						</form>
					{/if}
				</li>
			{/each}
			{#each data.pending as p}
				<li>
					<span><strong>{p.email}</strong><br /><span class="muted mono small">{p.role} · waiting for first login</span></span>
					<form method="POST" action="?/remove" use:enhance>
						<input type="hidden" name="email" value={p.email} />
						<button class="btn small danger">Cancel</button>
					</form>
				</li>
			{/each}
		</ul>
		<form method="POST" action="?/invite" use:enhance class="inline">
			<input name="email" type="email" placeholder="Google email of the new staff" required />
			<select name="role" aria-label="Role"><option value="staff">Staff</option><option value="admin">Admin</option></select>
			<button class="btn primary">Add</button>
		</form>
		{#if form?.staffMessage}<p class="notice">{form.staffMessage}</p>{/if}
	</div>
</section>

<style>
	.admin {
		padding-top: 16px;
		display: grid;
		gap: 16px;
	}
	h1 {
		font-size: 34px;
		margin: 0;
	}
	h2 {
		margin: 0 0 8px;
		color: var(--gold);
	}
	.back {
		font-size: 13px;
		color: var(--muted);
		text-decoration: none;
	}
	.card {
		display: grid;
		gap: 12px;
	}
	.card p {
		margin: 0;
	}
	.inline {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.inline input {
		flex: 1 1 200px;
	}
	.inline select {
		width: auto;
	}
	.people {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 10px;
	}
	.people li {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 10px;
		border-top: 1px solid var(--line);
		padding-top: 10px;
	}
	.people form {
		margin: 0;
	}
	.small {
		font-size: 12px;
	}
</style>
