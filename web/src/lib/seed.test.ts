import { describe, expect, it } from 'vitest';
import { seedTickets } from './seed';
import { childrenOf, trailTo } from './tickets';
import type { Ticket } from './types';
import {
	charCount,
	columns,
	depthMax,
	generatedNumber,
	isOverdue,
	isSchedule,
	isTicketId,
	subTicketsMax,
	textCharsMax,
	ticketsMax
} from './types';

// These days cross a month end, a leap day and a year end.
const todays = ['2026-11-03', '2026-03-01', '2028-02-29', '2026-12-31'];

function isCleanText(text: string): boolean {
	return text.trim() === text && charCount(text) > 0 && charCount(text) <= textCharsMax;
}

function find(tickets: Ticket[], id: string): Ticket {
	const ticket = tickets.find((candidate) => candidate.id === id);
	if (ticket === undefined) throw new Error(`no seed ticket ${id}`);
	return ticket;
}

describe('seedTickets', () => {
	it.each(todays)('keeps every rule on %s', (today) => {
		const tickets = seedTickets(today);
		expect(tickets.length).toBeLessThanOrEqual(ticketsMax);
		expect(new Set(tickets.map((ticket) => ticket.id)).size).toBe(tickets.length);
		for (const ticket of tickets) {
			expect(isTicketId(ticket.id), ticket.id).toBe(true);
			expect(isSchedule(ticket.schedule), ticket.id).toBe(true);
			expect(isCleanText(ticket.name), ticket.id).toBe(true);
			expect(childrenOf(tickets, ticket.id).length, ticket.id).toBeLessThanOrEqual(subTicketsMax);
			const trail = trailTo(tickets, ticket.id);
			expect(trail.length, ticket.id).toBeLessThanOrEqual(depthMax);
			expect(trail[0]?.parent, ticket.id).toBeNull();
		}
	});

	it('names only parents that are on the board', () => {
		const tickets = seedTickets('2026-11-03');
		const ids = new Set(tickets.map((ticket) => ticket.id));
		for (const ticket of tickets) {
			if (ticket.parent !== null) expect(ids.has(ticket.parent), ticket.id).toBe(true);
		}
	});

	it.each(todays)(
		'on %s has one overdue ticket, and one due today that is not overdue',
		(today) => {
			const tickets = seedTickets(today);
			const overdue = tickets.filter((ticket) => isOverdue(ticket, today));
			expect(overdue.map((ticket) => ticket.id)).toEqual(['TL-11']);
			expect(find(tickets, 'TL-13').schedule?.due).toBe(today);
		}
	);

	it('covers every column at the top level and among sub-tickets', () => {
		const tickets = seedTickets('2026-11-03');
		const topLevel = childrenOf(tickets, null);
		const subTickets = tickets.filter((ticket) => ticket.parent !== null);
		expect(new Set(topLevel.map((ticket) => ticket.column))).toEqual(new Set(columns));
		expect(new Set(subTickets.map((ticket) => ticket.column))).toEqual(new Set(columns));
	});

	it('gives every ticket a generated ID', () => {
		for (const ticket of seedTickets('2026-11-03'))
			expect(generatedNumber(ticket.id)).not.toBeNull();
	});

	it('nests two levels deep under one ticket, with sub-tickets in every stage', () => {
		const tickets = seedTickets('2026-11-03');
		const twoDeep = tickets.find((ticket) =>
			childrenOf(tickets, ticket.id).some((child) => childrenOf(tickets, child.id).length > 0)
		);
		const under = childrenOf(tickets, twoDeep!.id);
		expect(new Set(under.map((ticket) => ticket.column))).toEqual(
			new Set(['backlog', 'todo', 'in_progress', 'done'])
		);
	});

	it('skips one generated number, as if its ticket had been removed', () => {
		const numbers = seedTickets('2026-11-03')
			.map((ticket) => generatedNumber(ticket.id))
			.filter((number) => number !== null)
			.sort((first, second) => first - second);
		const missing = numbers.filter(
			(number, index) => index > 0 && number !== numbers[index - 1]! + 1
		);
		expect(numbers[0]).toBe(1);
		expect(missing).toHaveLength(1);
	});

	it('has an unscheduled ticket with no sub-tickets, and a ticket whose sub-tickets are all done', () => {
		const tickets = seedTickets('2026-11-03');
		expect(
			tickets.some(
				(ticket) => ticket.schedule === null && childrenOf(tickets, ticket.id).length === 0
			)
		).toBe(true);
		expect(
			tickets.some((ticket) => {
				const under = childrenOf(tickets, ticket.id);
				return under.length > 0 && under.every((each) => each.column === 'done');
			})
		).toBe(true);
	});

	it('has one ticket at every limit, scheduled for one day', () => {
		const today = '2026-11-03';
		const tickets = seedTickets(today);
		const limit = tickets.find(
			(ticket) => childrenOf(tickets, ticket.id).length === subTicketsMax
		)!;
		expect(charCount(limit.name)).toBe(textCharsMax);
		expect(limit.schedule).toEqual({ start: today, due: today });
		const under = childrenOf(tickets, limit.id);
		expect(under).toHaveLength(subTicketsMax);
		expect(charCount(under[0]!.name)).toBe(textCharsMax);
		const depthDeepest = Math.max(...tickets.map((ticket) => trailTo(tickets, ticket.id).length));
		expect(depthDeepest).toBe(depthMax);
		const deepest = tickets.find((ticket) => trailTo(tickets, ticket.id).length === depthMax);
		expect(trailTo(tickets, deepest!.id)[0]?.id).toBe(limit.id);
	});

	it('returns a fresh copy on every call', () => {
		const first = seedTickets('2026-11-03');
		first[0]!.name = 'Changed';
		expect(seedTickets('2026-11-03')[0]!.name).not.toBe('Changed');
	});
});
