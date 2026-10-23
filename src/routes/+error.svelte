<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head><title>{page.status} · Unplugged Board</title></svelte:head>

<section class="wrap err">
	<p class="display code">{page.status}</p>
	<p>{page.error?.message ?? 'Something went wrong.'}</p>
	<a class="btn primary" href="/jobs">Back to the board</a>
</section>

<style>
	.err {
		padding-top: 48px;
		text-align: center;
		display: grid;
		gap: 12px;
		justify-items: center;
	}
	.code {
		font-size: 72px;
		color: var(--gold);
		margin: 0;
		line-height: 1;
	}
</style>
