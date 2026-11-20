import type { Column, IsoDate, Schedule, Ticket, TicketComment } from './types';
import { depthMax, subTicketsMax, textCharsMax } from './types';

// Synthetic tickets for the fake API and the tests, one per case the board must
// show. Dates are relative to `today`, so "overdue" and "due today" stay true
// whenever this runs. Every ID and name is invented. The array order is the
// board order among the tickets under one parent, within each column.
export function seedTickets(today: IsoDate): Ticket[] {
	const day = (offset: number) => addDays(today, offset);
	const tickets: Ticket[] = [];
	let generated = 0;

	// Adds a ticket and gives its ID, the next generated one.
	function add(
		name: string,
		column: Column,
		schedule: Schedule,
		parent: string | null,
		description = ''
	): string {
		const ticketId = `TL-${++generated}`;
		tickets.push({ id: ticketId, name, column, schedule, parent, description });
		return ticketId;
	}

	// In progress, due next week, with workstreams two levels deep, in every
	// stage (its Backlog one is added last, below, so the IDs before it stay).
	const login = add(
		'Login page',
		'in_progress',
		{ start: day(-7), due: day(8) },
		null,
		// A description of more than one line.
		'Users sign in with their email and password.\n\nNeeds the session store and a reset email.'
	);
	add('Write the design note', 'done', null, login);
	add('Create branch', 'done', null, login);
	const develop = add('Develop with tests', 'in_progress', null, login);
	add('Write the handler', 'done', null, develop);
	add('Unit tests', 'todo', null, develop);
	add('Run integration tests', 'todo', null, login);

	// To do, scheduled to start later.
	const search = add('Search index', 'todo', { start: day(6), due: day(13) }, null);
	add('Write the design note', 'todo', null, search);
	add('Develop with tests', 'todo', null, search);

	// Overdue: due yesterday and not in Done.
	const csv = add('Export to CSV', 'todo', { start: day(-4), due: day(-1) }, null);
	add('Confirm acceptance tests', 'todo', null, csv);

	// Due today: the last day before overdue. A generated number is skipped, as
	// if its ticket had been removed, so numbers are never taken for positions.
	const session = add('Fix session timeout', 'in_progress', { start: day(-1), due: day(0) }, null);
	generated++;
	add('Reproduce on staging', 'done', null, session);
	add('Fix and unit test', 'in_progress', null, session);

	// Not scheduled and no sub-tickets yet.
	add('Disk space alert', 'todo', null, null);

	// Done with every sub-ticket done; its due date has passed, but Done is never
	// overdue.
	const usage = add('Monthly usage report', 'done', { start: day(-9), due: day(-2) }, null);
	add('Hand over for acceptance', 'done', null, usage);
	add('Support acceptance tests', 'done', null, usage);

	// In Backlog, not scheduled, with sub-tickets in Backlog and To do.
	const reminders = add('Email reminders', 'backlog', null, null);
	add('Scope with product', 'todo', null, reminders);
	add('Agree email wording', 'backlog', null, reminders);

	// At the limits: a name of 32 two-byte characters (so a byte count would
	// wrongly refuse it), a one-day schedule, as many sub-tickets as one ticket
	// holds (the first named at the limit too), and under the first of them a
	// chain nesting as deep as the board allows.
	const limit = add('é'.repeat(textCharsMax), 'todo', { start: day(0), due: day(0) }, null);
	let deepest = add('é'.repeat(textCharsMax), 'todo', null, limit);
	for (let number = 2; number <= subTicketsMax; number++) {
		add(`Part ${number}`, 'todo', null, limit);
	}
	for (let depth = 3; depth <= depthMax; depth++) {
		deepest = add(`Level ${depth}`, 'todo', null, deepest);
	}

	// The login page's sub-ticket in Backlog, so one card has sub-tickets
	// in every stage.
	add('Write release notes', 'backlog', null, login);

	return tickets;
}

// Synthetic comments on TL-1 and the tickets under it, two levels deep,
// so a parent's view shows its sub-tickets' comments rolled up. Oldest first;
// times are relative to `today`, like the seed's dates.
export function seedComments(today: IsoDate): TicketComment[] {
	const at = (offset: number, time: string) => `${addDays(today, offset)}T${time}:00.000Z`;
	return [
		{ id: 'C-1', ticketId: 'TL-2', text: 'Design note written and approved.', at: at(-6, '08:15') },
		{
			id: 'C-2',
			ticketId: 'TL-1',
			text: 'Kick-off done. Session store agreed with the platform team.',
			at: at(-5, '09:30')
		},
		{
			id: 'C-3',
			ticketId: 'TL-4',
			text: 'Handler done; waiting on test data for the unit tests.',
			at: at(-2, '13:05')
		},
		{
			id: 'C-4',
			ticketId: 'TL-6',
			text: 'Test data arrived.\nTwo cases still failing on rounding.',
			at: at(-1, '10:40')
		}
	];
}

function addDays(date: IsoDate, days: number): IsoDate {
	const result = new Date(`${date}T00:00:00Z`);
	result.setUTCDate(result.getUTCDate() + days);
	return result.toISOString().slice(0, 10);
}
