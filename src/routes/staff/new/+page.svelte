<script lang="ts">
	import ListingForm from '$lib/components/ListingForm.svelte';
	let { data, form } = $props();
</script>

<svelte:head><title>New {data.type} · Staff</title></svelte:head>

<section class="wrap page">
	<a class="mono back" href="/staff">← Staff</a>
	<h1 class="display">New {data.type}</h1>
	<nav class="types mono">
		<a href="?type=job" class:on={data.type === 'job'}>Job</a>
		<a href="?type=room" class:on={data.type === 'room'}>Room</a>
	</nav>
	{#key data.type}
		<ListingForm type={data.type} initial={data.initial} message={form?.message} />
	{/key}
</section>

<style>
	.page {
		padding-top: 16px;
		display: grid;
		gap: 12px;
	}
	h1 {
		font-size: 34px;
		margin: 0;
	}
	.back {
		font-size: 13px;
		color: var(--muted);
		text-decoration: none;
	}
	.types {
		display: flex;
		gap: 8px;
	}
	.types a {
		padding: 6px 14px;
		border-radius: 999px;
		border: 1px solid var(--line);
		color: var(--cream);
		text-decoration: none;
	}
	.types a.on {
		background: var(--gold);
		color: #1a1208;
		border-color: var(--gold);
	}
</style>
