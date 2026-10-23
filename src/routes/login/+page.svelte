<script lang="ts">
	let { data, form } = $props();
</script>

<svelte:head><title>Log in · Unplugged Board</title></svelte:head>

<section class="wrap narrow">
	<h1 class="display">Log in</h1>
	<p>
		Everyone can browse the board. To see <strong>contacts and original posts</strong>, log in and enter
		the Community Access Code shared in the Unplugged WhatsApp groups.
	</p>
	{#if data.error || form?.message}
		<p class="notice error">{form?.message ?? 'Login failed. Please try again.'}</p>
	{/if}
	<form method="POST" action="?/google">
		<input type="hidden" name="next" value={data.next} />
		<button class="btn primary block" type="submit">
			<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#1a1208" d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z"/></svg>
			Continue with Google
		</button>
	</form>
	<p class="muted small">
		We only store your name and email to run your account. See our <a href="/privacy">privacy policy</a>.
	</p>
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
	.small {
		font-size: 13px;
	}
</style>
