<script lang="ts">
	import ListingDetail from '$lib/components/ListingDetail.svelte';
	let { data, form } = $props();
</script>

<ListingDetail {data} {form} />
