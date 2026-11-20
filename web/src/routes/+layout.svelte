<script lang="ts">
	import type { Snippet } from 'svelte';
	import { localToday } from '../lib/board/dates';
	import { setApi, setToday } from '../lib/context';
	import { UnreadableBoard, createFakeApi } from '../lib/fake-api';
	import { durationLong, durationShort, easingCss } from '../lib/motion';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	// The root is the one place that reads the clock (Web 3.6) and creates the
	// `Api` (Web 1.3), so everything below gets them through context.
	const today = localToday(new Date());
	setToday(today);

	// Null when the `Api` started; otherwise which kind of failure to report.
	const failure = startApi();

	// Creating the `Api` reads browser storage, the one step here that can fail;
	// the layout reports it, since no page can (Web 4.4).
	function startApi(): 'unreadable' | 'other' | null {
		try {
			setApi(createFakeApi(localStorage, today, () => new Date()));
			return null;
		} catch (error) {
			console.error(error);
			return error instanceof UnreadableBoard ? 'unreadable' : 'other';
		}
	}
</script>

<!-- Gives every component's CSS transitions the same timing as `motion.ts`. -->
<div
	class="app"
	style:--duration-short="{durationShort}ms"
	style:--duration-long="{durationLong}ms"
	style:--easing={easingCss}
>
	{#if failure === 'unreadable'}
		<p role="alert">The saved board can't be read, so nothing has been changed or replaced.</p>
	{:else if failure === 'other'}
		<p role="alert">Something went wrong opening the board in this browser.</p>
	{:else}
		{@render children()}
	{/if}
</div>

<style>
	/* Only passes the timing down; it adds no box of its own. */
	.app {
		display: contents;
	}

	/* When the system asks for reduced motion, nothing moves. */
	@media (prefers-reduced-motion: reduce) {
		:global(*),
		:global(*::before),
		:global(*::after) {
			transition-duration: 0s !important;
			animation-duration: 0s !important;
		}
	}

	:global(body) {
		margin: 0;
		font-family: system-ui, sans-serif;
		color: #1f2328;
		background: #f6f7f9;
	}

	/* While something is carried, nothing gets selected and the pointer shows it. */
	:global(body.lifting) {
		cursor: grabbing;
		user-select: none;
	}

	:global(.visually-hidden) {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
</style>
