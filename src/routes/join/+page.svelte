<script lang="ts">
	let { data, form } = $props();
</script>

<svelte:head><title>Community Access Code · Unplugged Board</title></svelte:head>

<section class="wrap narrow">
	<h1 class="display">Access code</h1>
	<p>
		Enter the <strong>Community Access Code</strong> shared in the Unplugged WhatsApp groups. You only
		need to do this once (until the code changes).
	</p>
	<form method="POST">
		<input type="hidden" name="next" value={data.next} />
		<label class="field">
			<span>Code</span>
			<input name="code" autocomplete="off" autocapitalize="characters" spellcheck="false" required />
		</label>
		{#if form?.message}<p class="notice error">{form.message}</p>{/if}
		<button class="btn primary block" type="submit">Unlock contacts</button>
	</form>
	<p class="muted small">Not in the community yet? Ask a friend to add you to the Unplugged WhatsApp Community.</p>
</section>

<style>
	.narrow {
		max-width: 460px;
		padding-top: 32px;
		display: grid;
		gap: 16px;
	}
	h1 {
		font-size: 40px;
		margin: 0;
	}
	form {
		display: grid;
		gap: 12px;
	}
	input[name='code'] {
		font-family: var(--font-mono);
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}
	.small {
		font-size: 13px;
	}
</style>
