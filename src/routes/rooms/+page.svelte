<script lang="ts">
	import Board from '$lib/components/Board.svelte';
	let { data } = $props();
</script>

<svelte:head>
	<title>Rooms · Unplugged Board</title>
	<meta name="description" content="Rooms and share houses in Perth and WA, checked by the Unplugged crew." />
	<meta property="og:title" content="Rooms · Unplugged Board" />
	<meta property="og:description" content="Rooms and share houses in Perth and WA, checked by the Unplugged crew." />
	<meta property="og:image" content="{data.origin}/og-default.png" />
</svelte:head>

<Board type="room" listings={data.listings} filters={data.filters} saved={data.saved} />
