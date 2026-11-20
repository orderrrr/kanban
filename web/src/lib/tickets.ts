import type { Column, Ticket } from './types';
import { columns, depthMax } from './types';

// Questions about the flat board that the API and the page both ask, so both
// answer them by the same rules.

// The tickets directly under `parent` (null for the top level), in board order.
export function childrenOf(tickets: Ticket[], parent: string | null): Ticket[] {
	return tickets.filter((ticket) => ticket.parent === parent);
}

// The same tickets in stage order, Backlog first and Done last, keeping board
// order within each stage. A card lists its sub-tickets this way.
export function inStageOrder(tickets: Ticket[]): Ticket[] {
	return columns.flatMap((column) => tickets.filter((ticket) => ticket.column === column));
}

// The ticket and the ones above it, from the top level down to it. Empty when
// `id` isn't on the board. Its length is the ticket's depth.
export function trailTo(tickets: Ticket[], id: string): Ticket[] {
	const trail: Ticket[] = [];
	let current = tickets.find((ticket) => ticket.id === id);
	// Bounded by the depth limit, so a damaged board can't loop forever.
	for (let depth = 0; current !== undefined && depth < depthMax; depth++) {
		trail.unshift(current);
		const parent = current.parent;
		current = parent === null ? undefined : tickets.find((ticket) => ticket.id === parent);
	}
	return trail;
}

// The IDs of the ticket and every ticket below it, at any depth. Each level is
// one step, so a damaged board's loop can't run on: it stops at the depth limit.
export function familyOf(tickets: Ticket[], id: string): Set<string> {
	const family = new Set([id]);
	let level = [id];
	for (let depth = 1; level.length > 0 && depth < depthMax; depth++) {
		level = tickets
			.filter((ticket) => ticket.parent !== null && level.includes(ticket.parent))
			.map((ticket) => ticket.id)
			.filter((child) => !family.has(child));
		for (const child of level) family.add(child);
	}
	return family;
}

// The board with `ticket` taken out and put back in `column` at `index` among
// the other tickets under its parent there. Board order only matters within
// one parent and column, so a ticket that goes last can go at the very end.
export function placeAt(
	tickets: Ticket[],
	ticket: Ticket,
	column: Column,
	index: number
): Ticket[] {
	const moved: Ticket = { ...ticket, column };
	const others = tickets.filter((other) => other.id !== ticket.id);
	const before = others.filter((other) => other.parent === moved.parent && other.column === column)[
		index
	];
	const at = before === undefined ? others.length : others.indexOf(before);
	return [...others.slice(0, at), moved, ...others.slice(at)];
}
