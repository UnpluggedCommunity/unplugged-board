<script lang="ts">
	import Board from '$lib/components/Board.svelte';
	let { data } = $props();
</script>

<svelte:head>
	<title>Jobs · Unplugged Board</title>
	<meta name="description" content="Hand-picked jobs in Perth and WA for backpackers and working holiday makers." />
	<meta property="og:title" content="Jobs · Unplugged Board" />
	<meta property="og:description" content="Hand-picked jobs in Perth and WA for backpackers and working holiday makers." />
	<meta property="og:image" content="{data.origin}/og-default.png" />
</svelte:head>

<Board type="job" listings={data.listings} filters={data.filters} saved={data.saved} />
