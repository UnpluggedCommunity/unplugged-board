<script lang="ts">
	import ListingForm from '$lib/components/ListingForm.svelte';
	let { data, form } = $props();
</script>

<svelte:head><title>Edit #{data.id} · Staff</title></svelte:head>

<section class="wrap page">
	<a class="mono back" href="/staff">← Staff</a>
	<h1 class="display">Edit {data.type} #{data.id}</h1>
	<ListingForm type={data.type} initial={data.initial} photos={data.photos} message={form?.message} editing />
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
</style>
