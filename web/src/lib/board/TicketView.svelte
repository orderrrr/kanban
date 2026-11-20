<script lang="ts">
	import { tick } from 'svelte';
	import { fly } from 'svelte/transition';
	import { durationLong, easing, motion } from '../motion';
	import { familyOf, trailTo } from '../tickets';
	import type { IsoDate, Ticket, TicketComment } from '../types';
	import { isOverdue } from '../types';
	import Board from './Board.svelte';
	import Comments from './Comments.svelte';
	import DateRange from './DateRange.svelte';
	import Description from './Description.svelte';
	import type { OnEdit } from './edits';
	import TicketEditor from './TicketEditor.svelte';

	interface Props {
		ticket: Ticket;
		// The whole board, at every level.
		tickets: Ticket[];
		// Every comment on the board.
		comments: TicketComment[];
		today: IsoDate;
		onEdit: OnEdit;
		// Opens a ticket, or all tickets when null.
		onOpen: (id: string | null) => void;
		// Whether the comments sidebar is open. The page keeps it, so it stays
		// open when a tagged comment's ticket is opened from it.
		commentsOpen: boolean;
		onComments: (open: boolean) => void;
	}

	let { ticket, tickets, comments, today, onEdit, onOpen, commentsOpen, onComments }: Props =
		$props();

	// The tickets above this one, from the top level down.
	const above = $derived(trailTo(tickets, ticket.id).slice(0, -1));

	let editing = $state(false);
	let toggle = $state<HTMLButtonElement | null>(null);
	let sidebar = $state<HTMLElement | null>(null);

	// The sidebar's width, which it also slides in by.
	const sidebarWidth = 380;

	// This ticket's comments and those on every ticket below it, oldest first.
	// The `Api` lists comments in the order they were written, so keeping its
	// order is oldest first even for two written in the same moment, or a clock
	// that was set back.
	const shown = $derived.by(() => {
		const family = familyOf(tickets, ticket.id);
		return comments.filter((comment) => family.has(comment.ticketId));
	});

	// Closing puts focus back on the toggle when it was in the sidebar, so a
	// keyboard user carries on from there instead of the top of the page.
	async function closeComments(): Promise<void> {
		const hadFocus = sidebar?.contains(document.activeElement) ?? false;
		onComments(false);
		await tick();
		if (hadFocus) toggle?.focus();
	}

	// Escape closes the sidebar only when nothing else uses it: not in a field
	// (where it gives up what was typed), and not when a carry or a box used it
	// (they hear it first and mark it so).
	function closeOnEscape(event: KeyboardEvent): void {
		if (event.key !== 'Escape' || !commentsOpen || event.defaultPrevented) return;
		if (event.target instanceof Element && event.target.closest('input, textarea, select, form')) {
			return;
		}
		void closeComments();
	}

	// When the sidebar opens with focus nowhere (back open on another ticket
	// after a tag opened it, or opened from its toggle in a browser that
	// doesn't focus a clicked button), focus goes to its close button.
	function focusIfLost(opened: HTMLElement): void {
		if (document.activeElement !== document.body) return;
		opened.querySelector<HTMLElement>('button')?.focus();
	}
</script>

<svelte:window onkeydown={closeOnEscape} />

<section class="ticket-view" aria-label={ticket.id}>
	{#if commentsOpen}
		<!-- The comments open in a sidebar over the board's right side. -->
		<aside
			id="comments-panel"
			class="sidebar"
			aria-labelledby="comments-{ticket.id}"
			style:--sidebar-width="{sidebarWidth}px"
			bind:this={sidebar}
			{@attach focusIfLost}
			transition:fly={{ x: sidebarWidth, duration: motion(durationLong), easing }}
		>
			<Comments {ticket} {shown} {onEdit} {onOpen} onClose={closeComments} />
		</aside>
	{/if}
	<div class="top">
		<nav class="trail" aria-label="Where this ticket sits">
			<button type="button" onclick={() => onOpen(null)}>All tickets</button>
			{#each above as step (step.id)}
				<span aria-hidden="true">›</span>
				<button type="button" title={step.name} onclick={() => onOpen(step.id)}>{step.id}</button>
			{/each}
			<span aria-hidden="true">›</span>
			<span aria-current="page">{ticket.id}</span>
		</nav>
		<button
			type="button"
			class="comments-toggle"
			aria-expanded={commentsOpen}
			aria-controls="comments-panel"
			bind:this={toggle}
			onclick={() => (commentsOpen ? closeComments() : onComments(true))}
		>
			Comments <span class="count">{shown.length}</span>
		</button>
	</div>
	{#if editing}
		<!-- The name stays a heading while it is edited, so the page's outline doesn't change under the reader. -->
		<h2 class="visually-hidden">{ticket.name}</h2>
		<TicketEditor {ticket} {onEdit} size="view" onClose={() => (editing = false)} />
	{:else}
		<div class="heading">
			<h2>{ticket.name}</h2>
			<button
				type="button"
				class="edit"
				aria-label="Edit {ticket.id}"
				title="Edit name and dates"
				onclick={() => (editing = true)}
			>
				<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
					<path
						d="M11.3 1.7a1 1 0 0 1 1.4 0l1.6 1.6a1 1 0 0 1 0 1.4L5.9 13.1 2 14l.9-3.9 8.4-8.4z"
						fill="currentColor"
					/>
				</svg>
			</button>
		</div>
		<p class="schedule">
			<DateRange schedule={ticket.schedule} />
			{#if isOverdue(ticket, today)}<strong class="overdue-label">Overdue</strong>{/if}
		</p>
	{/if}
	<Description {ticket} {onEdit} />
	<Board {tickets} parent={ticket.id} {today} {onEdit} {onOpen} />
</section>

<style>
	.ticket-view {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	/* The trail and, at the right, the comments toggle share the top line. */
	.top {
		display: flex;
		gap: 12px;
		align-items: baseline;
		justify-content: space-between;
	}

	.comments-toggle {
		flex: none;
		padding: 4px 10px;
		border: 1px dashed #8c959f;
		border-radius: 6px;
		background: none;
		font: inherit;
		font-size: 0.85rem;
		color: inherit;
		cursor: pointer;
	}

	.comments-toggle:hover,
	.comments-toggle[aria-expanded='true'] {
		background: #eceef1;
	}

	.count {
		color: #59636e;
	}

	/* The sidebar lies over the right of the board, the window's full height,
	   so the columns keep their width. */
	.sidebar {
		position: fixed;
		top: 0;
		right: 0;
		z-index: 20;
		box-sizing: border-box;
		width: min(var(--sidebar-width), 100vw);
		/* The visible height, which on phones excludes the browser's toolbars. */
		height: 100dvh;
		padding: 16px;
		background: #fff;
		box-shadow: -8px 0 24px rgb(31 35 40 / 0.12);
	}

	.trail {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		align-items: baseline;
		font-size: 0.85rem;
		color: #59636e;
	}

	.trail button {
		padding: 0;
		border: none;
		background: none;
		font: inherit;
		color: inherit;
		cursor: pointer;
	}

	.trail button:hover {
		text-decoration: underline;
	}

	.trail [aria-current] {
		color: #1f2328;
	}

	.heading {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	/* The name and the line of dates sit inside the padding their fields have
	   when they are edited, so nothing moves when the pencil opens them. */
	h2 {
		margin: 6px 0;
		padding: 2px 8px;
		font-size: 1.2rem;
		overflow-wrap: anywhere;
	}

	.schedule {
		display: flex;
		gap: 8px;
		align-items: baseline;
		margin: 0 0 8px;
		padding: 2px 8px;
		font-size: 0.85rem;
		color: #59636e;
	}

	.overdue-label {
		color: #cf222e;
	}

	/* The pencil shows only while the ticket is hovered or it has focus. */
	.edit {
		display: flex;
		padding: 3px;
		border: none;
		border-radius: 4px;
		background: none;
		color: #59636e;
		cursor: pointer;
		opacity: 0;
		transition:
			opacity var(--duration-short) var(--easing),
			background-color var(--duration-short) var(--easing);
	}

	.ticket-view:hover .edit,
	.edit:focus-visible {
		opacity: 1;
	}

	/* A touch screen has no hover, so the pencil always shows there. */
	@media (hover: none) {
		.edit {
			opacity: 1;
		}
	}

	.edit:hover {
		background: #eceef1;
	}
</style>
