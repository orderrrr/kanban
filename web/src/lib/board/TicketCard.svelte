<script lang="ts">
	import type { IsoDate, Ticket } from '../types';
	import { isOverdue } from '../types';
	import { childrenOf } from '../tickets';
	import DateRange from './DateRange.svelte';
	import { countsText, stageColours, stageCounts } from './stages';
	import type { OnEdit } from './edits';
	import TicketEditor from './TicketEditor.svelte';

	interface Props {
		ticket: Ticket;
		// Whether the card is selected, to move with the others.
		selected: boolean;
		// The whole board, at every level, to count the sub-tickets.
		board: Ticket[];
		today: IsoDate;
		onEdit: OnEdit;
		// Alt and an arrow key on the grip asks to move the card.
		onMoveKey: (event: KeyboardEvent) => void;
		// Clicking the name opens the ticket's own board of sub-tickets.
		onOpen: (id: string) => void;
	}

	let { ticket, selected, board, today, onEdit, onMoveKey, onOpen }: Props = $props();

	const subTickets = $derived(childrenOf(board, ticket.id));

	const overdue = $derived(isOverdue(ticket, today));
	const doneCount = $derived(subTickets.filter((subTicket) => subTicket.column === 'done').length);
	const counts = $derived(stageCounts(subTickets));

	let editing = $state(false);
</script>

<article
	class="ticket"
	class:overdue
	class:selected
	aria-label="{ticket.id} {ticket.name}{selected ? ', selected' : ''}"
>
	<div class="actions">
		<button
			type="button"
			data-no-lift
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
		<button
			type="button"
			class="remove"
			data-no-lift
			aria-label="Remove {ticket.id}"
			title="Remove this ticket"
			onclick={() => onEdit({ kind: 'removeTicket', ticketId: ticket.id })}
		>
			<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
				<path
					d="M6 2h4l.5 1H13v1.5H3V3h2.5L6 2zm-2 3.5h8l-.6 8a1 1 0 0 1-1 .9H5.6a1 1 0 0 1-1-.9l-.6-8z"
					fill="currentColor"
				/>
			</svg>
		</button>
	</div>
	<!-- The ID is the keyboard grip: focus it and press Alt with the arrow keys. The card drags from anywhere that isn't a control. -->
	<button
		type="button"
		class="id"
		data-move-handle
		onkeydown={onMoveKey}
		aria-label="Move {ticket.id}"
		title="Drag to move, Alt and the arrow keys to move, Space to select">{ticket.id}</button
	>
	{#if editing}
		<TicketEditor {ticket} {onEdit} size="card" onClose={() => (editing = false)} />
	{:else}
		<h3>
			<button
				type="button"
				class="name"
				title="Open this ticket's sub-tickets"
				onclick={() => onOpen(ticket.id)}>{ticket.name}</button
			>
		</h3>
		<!-- A card shows only what it has: dates once scheduled, progress once it
		     has sub-tickets. -->
		{#if ticket.schedule !== null}
			<p class="schedule">
				<DateRange schedule={ticket.schedule} />
				{#if overdue}<strong class="overdue-label">Overdue</strong>{/if}
			</p>
		{/if}
	{/if}
	{#if subTickets.length > 0}
		<!-- The bar has one part per stage that has sub-tickets, sized by its
		     count, and hovering shows the numbers. Its value stays the done count.
		     It is drawn by hand rather than with <progress>, which has one fill. -->
		{@const countsLabel = countsText(counts)}
		<div
			class="progress"
			role="progressbar"
			aria-label={countsLabel}
			aria-valuetext={countsLabel}
			aria-valuemin={0}
			aria-valuemax={subTickets.length}
			aria-valuenow={doneCount}
			title={countsLabel}
		>
			<div class="track">
				{#each counts as { stage, count } (stage)}
					<span class="part" style:flex-grow={count} style:background={stageColours[stage]}></span>
				{/each}
			</div>
		</div>
	{/if}
</article>

<style>
	.ticket {
		background: #fff;
		/* Only an overdue card shows its border. */
		border: 1px solid transparent;
		border-radius: 6px;
		padding: 10px 12px;
		transition: border-color var(--duration-long) var(--easing);
	}

	.ticket.overdue {
		border-color: #cf222e;
	}

	/* A selected card is outlined, so it can be told apart from an overdue one. */
	.ticket.selected {
		outline: 2px solid #0969da;
		outline-offset: 1px;
	}

	.id {
		display: block;
		margin: 0;
		padding: 0;
		background: none;
		border: none;
		font: inherit;
		font-size: 0.8rem;
		color: #59636e;
		cursor: grab;
	}

	h3 {
		margin: 2px 0 6px;
		font-size: 0.95rem;
		overflow-wrap: anywhere;
	}

	.name {
		padding: 0;
		background: none;
		border: none;
		font: inherit;
		color: inherit;
		text-align: left;
		cursor: pointer;
	}

	.name:hover {
		text-decoration: underline;
	}

	.schedule {
		margin: 0 0 6px;
		font-size: 0.85rem;
		color: #59636e;
	}

	/* The row is taller than the bar it holds, so it is easy to hover. */
	.progress {
		padding: 4px 0;
	}

	/* The parts fill the whole bar, so it needs no outline; every stage colour
	   reaches 3:1 against the card. The gap keeps two parts side by side apart. */
	.track {
		display: flex;
		gap: 2px;
		height: 6px;
		border-radius: 3px;
		overflow: hidden;
	}

	.part {
		flex-basis: 0;
		transition: flex-grow var(--duration-long) var(--easing);
	}

	.overdue-label {
		color: #cf222e;
		margin-left: 6px;
	}

	.ticket {
		position: relative;
	}

	/* The pencil shows only while the card is hovered or it has focus. */
	/* The pencil and the trash icon show at the top right only while the card is
	   hovered or one of them has focus. */
	.actions {
		position: absolute;
		top: 6px;
		right: 6px;
		display: flex;
		gap: 2px;
		opacity: 0;
		transition: opacity var(--duration-short) var(--easing);
	}

	.ticket:hover .actions,
	.actions:focus-within {
		opacity: 1;
	}

	/* A touch screen has no hover, so the controls always show there. */
	@media (hover: none) {
		.actions {
			opacity: 1;
		}
	}

	.actions button {
		display: flex;
		padding: 3px;
		border: none;
		border-radius: 4px;
		background: none;
		color: #59636e;
		cursor: pointer;
		transition:
			background-color var(--duration-short) var(--easing),
			color var(--duration-short) var(--easing);
	}

	.actions button:hover {
		background: #eceef1;
	}

	.remove:hover {
		color: #cf222e;
	}
</style>
