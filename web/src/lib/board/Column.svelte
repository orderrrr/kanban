<script lang="ts">
	import { flip } from 'svelte/animate';
	import { fade } from 'svelte/transition';
	import type { Column as ColumnName, IsoDate, Ticket } from '../types';
	import type { OnEdit } from './edits';
	import { durationLong, easing, motion } from '../motion';
	import { grabbable } from './lift';
	import NewTicketLine from './NewTicketLine.svelte';
	import StatusBox from './StatusBox.svelte';
	import TicketCard from './TicketCard.svelte';

	interface Props {
		column: ColumnName;
		title: string;
		// The tickets shown here; a ticket being carried is left out.
		tickets: Ticket[];
		// The ticket this board is under, or null at the top level.
		parent: string | null;
		// The whole board as it is now, for each card's sub-tickets.
		board: Ticket[];
		// Where a gap opens for the carried ticket, and how tall, or null when
		// nothing is carried here.
		gap: { index: number; height: number } | null;
		// The cards just dropped and glided into place: they appear at once, so
		// they don't fade in under the card that glided there.
		landed: string[];
		// The selected tickets' IDs, and a way to add a card or take it out.
		selected: string[];
		onToggle: (ticket: Ticket) => void;
		today: IsoDate;
		onEdit: OnEdit;
		onPress: (event: PointerEvent, ticket: Ticket) => void;
		onMoveKey: (event: KeyboardEvent, ticket: Ticket) => void;
		onOpen: (id: string) => void;
	}

	let {
		column,
		title,
		tickets,
		parent,
		board,
		gap,
		landed,
		selected,
		onToggle,
		today,
		onEdit,
		onPress,
		onMoveKey,
		onOpen
	}: Props = $props();

	// The gap where the carried card would land, as a row of the list. Its key
	// can't be a ticket's, since IDs are TL- and a number.
	interface Gap {
		gapHeight: number;
	}
	const gapKey = 'gap';

	// The cards, with the gap. Card rows are the tickets themselves, so a card
	// only renders again when its ticket changes, not on every pointer move.
	const rows = $derived.by((): (Ticket | Gap)[] => {
		if (gap === null) return tickets;
		return [...tickets.slice(0, gap.index), { gapHeight: gap.height }, ...tickets.slice(gap.index)];
	});

	function isGap(row: Ticket | Gap): row is Gap {
		return 'gapHeight' in row;
	}

	function grabbableFor(ticket: Ticket): (element: HTMLElement) => () => void {
		return grabbable((event) => onPress(event, ticket));
	}
</script>

<section class="column" aria-label={title} data-column={column}>
	<div class="header">
		<h2><StatusBox status={column} />{title}</h2>
		<!-- Seen as a bare number; read out with its noun. -->
		<p class="count">
			<span aria-hidden="true">{tickets.length}</span>
			<span class="visually-hidden"
				>{tickets.length} {tickets.length === 1 ? 'ticket' : 'tickets'}</span
			>
		</p>
	</div>
	<ul>
		{#each rows as row (isGap(row) ? gapKey : row.id)}
			{@const ticket = isGap(row) ? null : row}
			<!-- One kind of row, so every card and the gap glide (`flip`) and fade
			     in and out as one list. Rows fade rather than fold: a row arrives at
			     full height, and a leaving one is taken out of the flow at once, so
			     the carried card and the gap swap places without the column
			     changing height. The gap goes at once, so it never shows over the
			     card that takes its place. -->
			<li
				class:gap={ticket === null}
				style:height={isGap(row) ? `${row.gapHeight}px` : null}
				data-ticket={ticket?.id}
				data-gap={ticket === null ? '' : undefined}
				{@attach ticket !== null && grabbableFor(ticket)}
				onclickcapture={(event) => {
					// Cmd- or Ctrl-click adds the card to the selection or takes it out,
					// instead of whatever the click would have done.
					if (ticket === null || !(event.metaKey || event.ctrlKey)) return;
					// Clicks inside the open name and dates editor are the editor's.
					if (event.target instanceof Element && event.target.closest('form') !== null) return;
					event.preventDefault();
					event.stopPropagation();
					onToggle(ticket);
				}}
				animate:flip={{ duration: motion(durationLong), easing }}
				in:fade={{
					duration: ticket !== null && landed.includes(ticket.id) ? 0 : motion(durationLong),
					easing
				}}
				out:fade={{ duration: ticket === null ? 0 : motion(durationLong), easing }}
			>
				{#if ticket === null}
					<span class="visually-hidden">Drop here</span>
				{:else}
					<TicketCard
						{ticket}
						selected={selected.includes(ticket.id)}
						{board}
						{today}
						{onEdit}
						onMoveKey={(event) => onMoveKey(event, ticket)}
						{onOpen}
					/>
				{/if}
			</li>
		{/each}
	</ul>
	{#if column === 'backlog'}
		<NewTicketLine {parent} {onEdit} />
	{/if}
</section>

<style>
	.column {
		min-height: 200px;
		background: #eceef1;
		padding: 12px;
	}

	/* The heading reads: the stage's box, its name, and how many are in it. */
	.header {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 12px;
	}

	h2 {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 1rem;
		margin: 0;
	}

	.count {
		margin: 0 0 0 auto;
		color: #59636e;
		font-size: 0.85rem;
	}

	ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	li {
		/* A card may shrink below its content's width, so it never spills out
		   of its column. */
		min-width: 0;
		margin-bottom: 10px;
	}

	.gap {
		border: 1px dashed #59636e;
		border-radius: 6px;
	}
</style>
