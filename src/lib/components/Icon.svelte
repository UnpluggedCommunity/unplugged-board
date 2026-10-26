<script lang="ts" module>
	// Stroke icons, 24×24 grid (Lucide-style shapes, drawn inline to avoid a dependency).
	const PATHS = {
		briefcase: 'M3 7h18v13H3zM8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18',
		home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
		bookmark: 'M6 3h12v18l-6-4-6 4z',
		user: 'M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zM3.5 21a8.5 8.5 0 0 1 17 0',
		search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
		sliders: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4',
		pin: 'M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
		calendar: 'M4 5h16v16H4zM4 10h16M8 3v4M16 3v4',
		clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
		bolt: 'M13 2 4 14h7l-1 8 9-12h-7z',
		check: 'M5 12.5 10 17 19 7',
		back: 'M15 5l-7 7 7 7',
		next: 'M9 5l7 7-7 7',
		file: 'M14 3H6v18h12V7zM14 3v4h4M9 13h6M9 17h6',
		send: 'M21 3 10 14M21 3l-7 18-4-7-7-4z',
		mail: 'M3 5h18v14H3zM3 6l9 7 9-7',
		chat: 'M4 20l1.5-4A8 8 0 1 1 8 19z',
		link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
		sparkles: 'M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8zM5 2l.6 1.4L7 4l-1.4.6L5 6l-.6-1.4L3 4l1.4-.6z',
		plus: 'M12 5v14M5 12h14',
		trash: 'M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14',
		upload: 'M12 16V4M7 9l5-5 5 5M4 20h16',
		x: 'M6 6l12 12M18 6 6 18',
		shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
		car: 'M5 16h14M3 16v-3l2-5h14l2 5v3M6 16v3M18 16v3M7 13h.01M17 13h.01',
		ticket: 'M3 8a2 2 0 0 0 0 4v4h18v-4a2 2 0 0 0 0-4V4H3zM13 4v16',
		logout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11',
		copy: 'M8 8h12v12H8zM4 16V4h12',
		share: 'M12 3v12M7 8l5-5 5 5M5 13v7h14v-7',
		phone: 'M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z',
		star: 'M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z',
		globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18',
		bed: 'M3 18V6M3 14h18v4M21 14v-3a3 3 0 0 0-3-3h-7v6M7 11.5a1.5 1.5 0 1 0 0-.01'
	} as const;
	export type IconName = keyof typeof PATHS;
</script>

<script lang="ts">
	let {
		name,
		size = 18,
		filled = false,
		stroke = 1.8,
		class: cls = ''
	}: { name: IconName; size?: number; filled?: boolean; stroke?: number; class?: string } = $props();
</script>

<svg
	class="icon {cls}"
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill={filled ? 'currentColor' : 'none'}
	stroke="currentColor"
	stroke-width={stroke}
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"><path d={PATHS[name]} /></svg
>

<style>
	.icon {
		flex: none;
		display: inline-block;
		vertical-align: middle;
	}
</style>
