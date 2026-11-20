<script lang="ts">
	import type { Column as ColumnName, IsoDate, Ticket } from '../types';
	import { columnTitles } from '../types';
	import { columns } from '../types';
	import { durationLong, motionAllowed } from '../motion';
	import { childrenOf, inStageOrder } from '../tickets';
	import Column from './Column.svelte';
	import type { OnEdit } from './edits';
	import type { Lifted } from './lift';
	import { contains, landingIndex, middlesOf, pressToLift } from './lift';
	import type { Box } from './select';
	import { overlaps, pressToSelect } from './select';
	import TicketCard from './TicketCard.svelte';

	interface Props {
		// The whole board, at every level.
		tickets: Ticket[];
		// Shows the tickets directly under this one, or the top level when null.
		parent: string | null;
		today: IsoDate;
		onEdit: OnEdit;
		onOpen: (id: string) => void;
	}

	let { tickets, parent, today, onEdit, onOpen }: Props = $props();

	const siblings = $derived(childrenOf(tickets, parent));

	const columnSteps: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1 };

	let board = $state<HTMLDivElement | null>(null);

	// The selected tickets' IDs. Dragging any of them carries them all, and
	// Alt with Left or Right on one moves them all a stage.
	let selected = $state<string[]>([]);

	// The box being drawn on empty space to select cards, in window coordinates.
	let selecting = $state<Box | null>(null);

	// This holds what was selected when the box began: it is kept when Shift
	// is held, and put back if Escape gives up on the box.
	let selectedBefore: string[] = [];

	// The ticket being carried, where the pointer is, and where it would land:
	// a column and an index among that column's other tickets, or null when it
	// would go back. `tilt` sways it, in degrees, with how far the pointer
	// moved sideways since its last move; `landing` is where it glides to once
	// dropped, until it is placed.
	// `group` is everything carried, in board order: the grabbed card alone, or
	// every selected card when it was one of them.
	let carried = $state<{
		ticket: Ticket;
		group: Ticket[];
		lifted: Lifted;
		x: number;
		y: number;
		target: { column: ColumnName; index: number } | null;
		tilt: number;
		landing: { left: number; top: number } | null;
	} | null>(null);

	// The sway: degrees per pixel moved sideways, up to a few degrees either way,
	// and how soon it straightens once the pointer rests.
	const tiltPerPixel = 0.4;
	const tiltMax = 5;
	const tiltRestMilliseconds = 90;
	let straighten: ReturnType<typeof setTimeout> | undefined;

	// The cards most recently dropped into place, which their columns show at once.
	let landed = $state<string[]>([]);

	// Counts lifts, so a drop that waits (to glide, then to save) can tell
	// whether another card has been picked up meanwhile.
	let lifts = 0;

	function tiltFor(sideways: number): number {
		if (!motionAllowed()) return 0;
		return Math.max(-tiltMax, Math.min(tiltMax, sideways * tiltPerPixel));
	}

	function isCarried(ticket: Ticket): boolean {
		return carried?.group.some((member) => member.id === ticket.id) ?? false;
	}

	function shownIn(column: ColumnName): Ticket[] {
		return siblings.filter((ticket) => ticket.column === column && !isCarried(ticket));
	}

	function gapIn(column: ColumnName): { index: number; height: number } | null {
		if (carried === null || carried.target?.column !== column) return null;
		return { index: carried.target.index, height: carried.lifted.height };
	}

	function targetAt(
		x: number,
		y: number,
		group: Ticket[]
	): { column: ColumnName; index: number } | null {
		if (board === null) return null;
		// The carried cards may not have left the page yet, so they are never counted.
		const others =
			'[data-ticket]' + group.map((member) => `:not([data-ticket="${member.id}"])`).join('');
		for (const column of columns) {
			const area = board.querySelector(`[data-column="${column}"]`);
			if (area === null || !contains(area, x, y)) continue;
			return { column, index: landingIndex(y, middlesOf(area, others)) };
		}
		return null;
	}

	// Where the ticket sits now, in the same terms as a target.
	function placeOf(ticket: Ticket): { column: ColumnName; index: number } {
		const column = siblings.filter((other) => other.column === ticket.column);
		return { column: ticket.column, index: column.findIndex((other) => other.id === ticket.id) };
	}

	// Grabbing a selected card carries every selected card, in the order they
	// are seen: column by column, top to bottom. Any other card goes alone.
	function groupFor(ticket: Ticket): Ticket[] {
		if (!selected.includes(ticket.id)) return [ticket];
		return inStageOrder(siblings.filter((other) => selected.includes(other.id)));
	}

	function press(event: PointerEvent, ticket: Ticket): void {
		if (!(event.currentTarget instanceof HTMLElement)) return;
		pressToLift(event, event.currentTarget, {
			onLift: (lifted, x, y) => {
				lifts++;
				landed = [];
				const group = groupFor(ticket);
				const target = placeOf(ticket);
				carried = { ticket, group, lifted, x, y, target, tilt: 0, landing: null };
			},
			onMove: (x, y) => {
				if (carried === null) return;
				const tilt = tiltFor(x - carried.x);
				const target = targetAt(x, y, carried.group);
				carried = { ...carried, x, y, target, tilt };
				clearTimeout(straighten);
				straighten = setTimeout(() => {
					if (carried !== null) carried = { ...carried, tilt: 0 };
				}, tiltRestMilliseconds);
			},
			onDrop: () => {
				void drop();
			},
			onCancel: () => {
				clearTimeout(straighten);
				carried = null;
			}
		});
	}

	// The card glides from the pointer into the gap, the gap holds until the
	// moves are saved, then the cards take its place, so they settle where they
	// were dropped instead of jumping.
	async function drop(): Promise<void> {
		clearTimeout(straighten);
		const released = carried;
		if (released === null || released.target === null) {
			carried = null;
			return;
		}
		const lift = lifts;
		// The drop keeps its own cards and place, since another card may be picked
		// up while they glide. They land just before the card now shown after the
		// gap, or last.
		const { group, target } = released;
		const before = shownIn(target.column)[target.index] ?? null;
		// A gap leaving the page may still be inert for a moment; it lands in the live one.
		const gap = board?.querySelector('[data-gap]:not([inert])');
		if (gap !== null && gap !== undefined && motionAllowed()) {
			const box = gap.getBoundingClientRect();
			carried = { ...released, tilt: 0, landing: { left: box.left, top: box.top } };
			await new Promise((resolve) => setTimeout(resolve, durationLong));
		}
		landed = await moveAll(group, target.column, before);
		// Another card may have been picked up while this one glided or saved.
		if (lifts === lift) carried = null;
	}

	// Moves `group` into `column`, in order, each just before `before` (or last
	// when null), so they end up together there. One move each, as the `Api`
	// has no move for many; it stops at the first refused one. Each index is
	// worked out on the board as it is after the moves before it. Gives the IDs
	// of the cards now in place there.
	async function moveAll(
		group: Ticket[],
		column: ColumnName,
		before: Ticket | null
	): Promise<string[]> {
		const placed: string[] = [];
		for (const member of group) {
			const others = siblings.filter((other) => other.column === column && other.id !== member.id);
			const at = before === null ? -1 : others.findIndex((other) => other.id === before.id);
			const index = at === -1 ? others.length : at;
			const from = placeOf(member);
			const already = from.column === column && from.index === index;
			if (!already && !(await onEdit({ kind: 'moveTicket', ticketId: member.id, column, index }))) {
				return placed;
			}
			placed.push(member.id);
		}
		return placed;
	}

	function toggle(ticket: Ticket): void {
		selected = selected.includes(ticket.id)
			? selected.filter((id) => id !== ticket.id)
			: [...selected, ticket.id];
	}

	// Keys on a card's grip. Space adds it to the selection or takes it out.
	// Alt with Up or Down moves it within its column. Alt with Left or Right
	// moves it, or every selected card when it is one of them, to the end of
	// the next column. The grip keeps focus.
	async function moveByKey(event: KeyboardEvent, ticket: Ticket): Promise<void> {
		if (event.key === ' ' && !event.altKey) {
			event.preventDefault();
			toggle(ticket);
			return;
		}
		if (!event.altKey) return;
		const target = keyTarget(event.key, ticket);
		if (target === null) return;
		event.preventDefault();
		// Cards moved by keyboard fade into their new place, even if they were
		// the last dropped.
		landed = [];
		const sideways = columnSteps[event.key] !== undefined;
		if (sideways) await moveAll(groupFor(ticket), target.column, null);
		else await onEdit({ kind: 'moveTicket', ticketId: ticket.id, ...target });
		// The row it left may still be fading out (Svelte makes it inert), so
		// only a live row's grip takes focus.
		board
			?.querySelector<HTMLElement>(`[data-ticket="${ticket.id}"]:not([inert]) [data-move-handle]`)
			?.focus();
	}

	// A press on empty space draws a box that selects every card it touches;
	// with Shift it adds to what was selected. A click there clears the
	// selection. Presses on cards and controls are theirs, not the board's.
	function pressBoard(event: PointerEvent): void {
		if (!(event.target instanceof Element)) return;
		if (event.target.closest('[data-ticket], button, input, select, textarea, a, form') !== null) {
			return;
		}
		// A press on the board's own scrollbar scrolls; it doesn't select.
		if (event.target === board && board !== null) {
			if (event.offsetX >= board.clientWidth || event.offsetY >= board.clientHeight) return;
		}
		const adding = event.shiftKey;
		selectedBefore = selected;
		pressToSelect(event, {
			onBox: (box) => {
				selecting = box;
				selected = cardsIn(box, adding ? selectedBefore : []);
			},
			onEnd: (drew) => {
				selecting = null;
				if (!drew && !adding) selected = [];
			},
			onCancel: () => {
				selecting = null;
				selected = selectedBefore;
			}
		});
	}

	// The cards `box` touches, with `kept`, in the order they are seen.
	function cardsIn(box: Box, kept: string[]): string[] {
		if (board === null) return kept;
		const hit = [...board.querySelectorAll('[data-ticket]:not([inert])')]
			.filter((row) => overlaps(box, row.getBoundingClientRect()))
			.map((row) => row.getAttribute('data-ticket'));
		return inStageOrder(
			siblings.filter((ticket) => kept.includes(ticket.id) || hit.includes(ticket.id))
		).map((ticket) => ticket.id);
	}

	// Escape clears the selection, unless it is giving up on a carry or a box,
	// or leaving a field (such as the name and dates editor).
	function clearOnEscape(event: KeyboardEvent): void {
		// A carry or a box being drawn hears Escape first and marks it used.
		if (event.key !== 'Escape' || event.defaultPrevented) return;
		if (event.target instanceof Element && event.target.closest('input, textarea, select, form')) {
			return;
		}
		selected = [];
	}

	function keyTarget(key: string, ticket: Ticket): { column: ColumnName; index: number } | null {
		const { column, index } = placeOf(ticket);
		const count = siblings.filter((other) => other.column === column).length;
		if (key === 'ArrowUp') return index > 0 ? { column, index: index - 1 } : null;
		if (key === 'ArrowDown') return index < count - 1 ? { column, index: index + 1 } : null;
		const step = columnSteps[key];
		if (step === undefined) return null;
		const next = columns[columns.indexOf(column) + step];
		if (next === undefined) return null;
		return { column: next, index: siblings.filter((other) => other.column === next).length };
	}
</script>

<svelte:window onkeydown={clearOnEscape} />

<!-- Box selection is for a mouse or pen; the keyboard way is Space on a card's ID. -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="board"
	style:--column-count={columns.length}
	bind:this={board}
	onpointerdown={pressBoard}
>
	{#each columns as column (column)}
		<Column
			{column}
			title={columnTitles[column]}
			tickets={shownIn(column)}
			{parent}
			board={tickets}
			gap={gapIn(column)}
			{landed}
			{selected}
			onToggle={toggle}
			{today}
			{onEdit}
			onPress={press}
			onMoveKey={moveByKey}
			{onOpen}
		/>
	{/each}
</div>

{#if carried !== null}
	<div
		class="carried"
		class:landing={carried.landing !== null}
		inert
		style:left="{carried.landing?.left ?? carried.x - carried.lifted.offsetX}px"
		style:top="{carried.landing?.top ?? carried.y - carried.lifted.offsetY}px"
		style:width="{carried.lifted.width}px"
		style:--tilt="{carried.tilt}deg"
	>
		<TicketCard
			ticket={carried.ticket}
			board={tickets}
			selected={false}
			{today}
			onEdit={async () => false}
			onMoveKey={() => {}}
			onOpen={() => {}}
		/>
		{#if carried.group.length > 1}
			<span class="count" aria-hidden="true">{carried.group.length}</span>
		{/if}
	</div>
{/if}

{#if selecting !== null}
	<div
		class="selecting"
		aria-hidden="true"
		style:left="{selecting.left}px"
		style:top="{selecting.top}px"
		style:width="{selecting.right - selecting.left}px"
		style:height="{selecting.bottom - selecting.top}px"
	></div>
{/if}

<style>
	.board {
		display: grid;
		/* Fills the rest of the window, so each column's colour reaches the bottom. */
		flex: 1;
		/* Each column keeps a readable width; when they don't all fit, the board
		   scrolls sideways rather than squeezing them or stacking them. */
		grid-template-columns: repeat(var(--column-count), minmax(300px, 1fr));
		gap: 16px;
		overflow-x: auto;
		/* As a flex item it may be narrower than its columns, so it, not the
		   page, is what scrolls; positioned, so the visually hidden text inside
		   scrolls with it instead of widening the page. */
		min-width: 0;
		position: relative;
	}

	/* The carried card lifts off the board as it is picked up. */
	.carried {
		position: fixed;
		z-index: 10;
		pointer-events: none;
		opacity: 0.95;
		border-radius: 6px;
		box-shadow: 0 8px 24px rgb(31 35 40 / 0.18);
		transform: rotate(var(--tilt)) scale(1.03);
		animation: lift var(--duration-short) var(--easing);
		transition: transform var(--duration-long) var(--easing);
	}

	/* Once dropped it glides into the gap and settles flat there. */
	.carried.landing {
		box-shadow: none;
		transform: none;
		transition:
			left var(--duration-long) var(--easing),
			top var(--duration-long) var(--easing),
			transform var(--duration-long) var(--easing),
			box-shadow var(--duration-long) var(--easing);
	}

	/* How many cards are carried, at the grabbed card's corner. */
	.count {
		position: absolute;
		top: -8px;
		right: -8px;
		min-width: 20px;
		padding: 2px 6px;
		box-sizing: border-box;
		border-radius: 10px;
		background: #1f2328;
		color: #fff;
		font-size: 0.75rem;
		text-align: center;
	}

	.selecting {
		position: fixed;
		z-index: 10;
		pointer-events: none;
		border: 1px solid #0969da;
		background: rgb(9 105 218 / 0.08);
	}

	@keyframes lift {
		from {
			box-shadow: none;
			transform: rotate(0deg) scale(1);
		}
	}
</style>
