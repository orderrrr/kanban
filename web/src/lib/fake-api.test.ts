import { describe, expect, it } from 'vitest';
import type { Api } from './api';
import type { BoardStorage } from './fake-api';
import { MalformedRequest, UnreadableBoard, createFakeApi, storageKey } from './fake-api';
import { seedTickets } from './seed';
import { childrenOf } from './tickets';
import type { ApiErrorCode, Column, Schedule, Ticket } from './types';
import {
	ApiError,
	commentCharsMax,
	commentsMax,
	depthMax,
	descriptionCharsMax,
	generatedNumberMax,
	subTicketsMax,
	textCharsMax,
	ticketsMax
} from './types';

const today = '2026-11-03';
// The fake API's clock, fixed so comment times are known.
const clock = () => new Date('2026-11-03T09:00:00Z');
const backwards: Schedule = { start: '2026-11-05', due: '2026-11-04' };

// The seed's highest generated ID is TL-119, so the next one is TL-120.
const generatedNext = 'TL-120';

// A stand-in for `localStorage` that can also be told to fail on save.
class MemoryStorage implements BoardStorage {
	items = new Map<string, string>();
	failSaves = false;

	getItem(key: string): string | null {
		return this.items.get(key) ?? null;
	}

	setItem(key: string, value: string): void {
		if (this.failSaves) throw new Error('storage full');
		this.items.set(key, value);
	}
}

function freshApi(): { api: Api; storage: MemoryStorage } {
	const storage = new MemoryStorage();
	return { api: createFakeApi(storage, today, clock), storage };
}

// An `Api` over a saved board holding exactly `tickets`.
function savedApi(tickets: Ticket[], generatedNumberNext: number): Api {
	const storage = new MemoryStorage();
	storage.items.set(storageKey, JSON.stringify({ tickets, generatedNumberNext }));
	return createFakeApi(storage, today, clock);
}

function ticket(id: string, parent: string | null, column: Column = 'todo'): Ticket {
	return { id, name: `Name of ${id}`, column, schedule: null, parent, description: '' };
}

// A chain `length` deep from TL-1 down to TL-(length).
function chain(length: number): Ticket[] {
	return Array.from({ length }, (_unused, level) =>
		ticket(`TL-${level + 1}`, level === 0 ? null : `TL-${level}`)
	);
}

async function expectRefused(request: Promise<unknown>, code: ApiErrorCode): Promise<void> {
	const error = await request.then(
		() => null,
		(reason: unknown) => reason
	);
	expect(error).toBeInstanceOf(ApiError);
	if (error instanceof ApiError) expect(error.code).toBe(code);
}

async function expectMalformed(request: Promise<unknown>): Promise<void> {
	await expect(request).rejects.toBeInstanceOf(MalformedRequest);
}

async function findTicket(api: Api, id: string): Promise<Ticket | undefined> {
	return (await api.listTickets()).find((candidate) => candidate.id === id);
}

// The IDs under `parent` in `column`, in board order.
async function columnIds(api: Api, parent: string | null, column: Column): Promise<string[]> {
	return childrenOf(await api.listTickets(), parent)
		.filter((candidate) => candidate.column === column)
		.map((candidate) => candidate.id);
}

describe('loading', () => {
	it('seeds and saves the board on the first visit', async () => {
		const { api, storage } = freshApi();
		expect(await api.listTickets()).toEqual(seedTickets(today));
		expect(storage.items.has(storageKey)).toBe(true);
	});

	it('reads the saved board on the next visit', async () => {
		const { api, storage } = freshApi();
		await api.renameTicket('TL-6', 'Renamed');
		const again = createFakeApi(storage, '2027-01-01', clock);
		expect((await findTicket(again, 'TL-6'))?.name).toBe('Renamed');
	});

	it('reads a saved board whose next number is one above its highest, nested depthMax deep', async () => {
		const api = savedApi(chain(depthMax), depthMax + 1);
		expect(await api.listTickets()).toHaveLength(depthMax);
		expect((await api.createTicket('Next', null, null)).id).toBe(`TL-${depthMax + 1}`);
	});

	const good = ticket('TL-900', null);
	const saved = (tickets: unknown[], generatedNumberNext: unknown = 902) =>
		JSON.stringify({ tickets, generatedNumberNext });

	it.each([
		['not JSON', 'not json'],
		['not an object', 'null'],
		['tickets that are not a list', '{"tickets": 3, "generatedNumberNext": 1}'],
		['no generatedNumberNext', JSON.stringify({ tickets: [good] })],
		['a generatedNumberNext that is not a whole number', saved([good], 1.5)],
		['a generatedNumberNext equal to the highest TL number', saved([ticket('TL-5', null)], 5)],
		['a generatedNumberNext below the highest TL number', saved([ticket('TL-5', null)], 2)],
		['duplicate IDs', saved([good, good])],
		['a parent that is not on the board', saved([ticket('TL-1', 'TL-9')], 2)],
		['a parent loop', saved([ticket('TL-1', 'TL-2'), ticket('TL-2', 'TL-1')], 3)],
		['a ticket that is its own parent', saved([ticket('TL-1', 'TL-1')], 2)],
		['nesting deeper than depthMax', saved(chain(depthMax + 1), depthMax + 2)],
		[
			'more sub-tickets than subTicketsMax under a sub-ticket',
			saved([
				good,
				ticket('TL-901', 'TL-900'),
				...Array.from({ length: subTicketsMax + 1 }, (_unused, index) =>
					ticket(`TL-${index + 1}`, 'TL-901')
				)
			])
		],
		[
			'more sub-tickets than subTicketsMax under a top-level ticket',
			saved([
				good,
				...Array.from({ length: subTicketsMax + 1 }, (_unused, index) =>
					ticket(`TL-${index + 1}`, 'TL-900')
				)
			])
		],
		[
			'more tickets than ticketsMax',
			saved(
				Array.from({ length: ticketsMax + 1 }, (_unused, index) => ticket(`TL-${index + 1}`, null)),
				ticketsMax + 2
			)
		],
		['a ticket missing its fields', saved([{}])],
		[
			'a ticket with no parent field',
			saved([{ id: 'TL-900', name: 'x', column: 'todo', schedule: null }])
		],
		['a malformed ticket ID', saved([{ ...good, id: 'TL-0' }])],
		['a typed DEV- ID', saved([{ ...good, id: 'DEV-7' }])],
		['a malformed parent ID', saved([{ ...good, parent: 'TL-0' }])],
		['a blank name', saved([{ ...good, name: '' }])],
		['an untrimmed name', saved([{ ...good, name: ' x' }])],
		['a name over textCharsMax', saved([{ ...good, name: 'é'.repeat(textCharsMax + 1) }])],
		['an unknown column', saved([{ ...good, column: 'blocked' }])],
		['a backwards schedule', saved([{ ...good, schedule: backwards }])],
		['a schedule missing its due date', saved([{ ...good, schedule: { start: '2026-11-03' } }])]
	])('refuses a saved board with %s, and keeps it', (_description, board) => {
		const storage = new MemoryStorage();
		storage.items.set(storageKey, board);
		expect(() => createFakeApi(storage, today, clock)).toThrow(UnreadableBoard);
		expect(storage.items.get(storageKey)).toBe(board);
	});

	it('keeps the board unchanged when saving fails', async () => {
		const { api, storage } = freshApi();
		storage.failSaves = true;
		await expect(api.renameTicket('TL-1', 'Lost')).rejects.toThrow('storage full');
		await expect(api.createTicket('Lost', null, null)).rejects.toThrow('storage full');
		await expect(api.removeTicket('TL-17')).rejects.toThrow('storage full');
		expect(await api.listTickets()).toEqual(seedTickets(today));
		storage.failSaves = false;
		// The failed create took no number.
		expect((await api.createTicket('Kept', null, null)).id).toBe(generatedNext);
	});

	it('hands out copies, so changing one does not change the board', async () => {
		const { api } = freshApi();
		const tickets = await api.listTickets();
		tickets[0]!.name = 'Changed outside';
		const changed = await api.renameTicket('TL-1', 'Inside');
		changed.name = 'Changed outside too';
		expect((await api.listTickets())[0]!.name).toBe('Inside');
	});
});

describe('createTicket', () => {
	it('adds a trimmed top-level ticket at the end of Backlog, with the next ID and no sub-tickets', async () => {
		const { api } = freshApi();
		const created = await api.createTicket(' \tNew work\n', null, null);
		expect(created).toEqual({
			id: generatedNext,
			name: 'New work',
			column: 'backlog',
			schedule: null,
			parent: null,
			description: ''
		});
		expect(await columnIds(api, null, 'backlog')).toEqual(['TL-21', generatedNext]);
		expect(childrenOf(await api.listTickets(), generatedNext)).toEqual([]);
	});

	it('adds a sub-ticket at the end of Backlog under its parent', async () => {
		const { api } = freshApi();
		const schedule = { start: '2026-11-03', due: '2026-11-04' };
		const created = await api.createTicket('Draft email', schedule, 'TL-21');
		expect(created).toEqual({
			id: generatedNext,
			name: 'Draft email',
			column: 'backlog',
			schedule,
			parent: 'TL-21',
			description: ''
		});
		expect(await columnIds(api, 'TL-21', 'backlog')).toEqual(['TL-23', generatedNext]);
		expect(await columnIds(api, null, 'backlog')).toEqual(['TL-21']);
	});

	it('continues the seed count, and never reuses a number, even after removal and a reload', async () => {
		const { api, storage } = freshApi();
		expect((await api.createTicket('First', null, null)).id).toBe('TL-120');
		await api.removeTicket('TL-120');
		expect((await api.createTicket('Second', null, null)).id).toBe('TL-121');
		await api.removeTicket('TL-121');
		const again = createFakeApi(storage, today, clock);
		expect((await again.createTicket('Third', null, null)).id).toBe('TL-122');
	});

	it('uses the saved next number, not the highest on the board', async () => {
		const api = savedApi([ticket('TL-7', null)], 50);
		expect((await api.createTicket('Next', null, null)).id).toBe('TL-50');
	});

	it('gives out the last number, then refuses the next ticket', async () => {
		const api = savedApi([], generatedNumberMax);
		expect((await api.createTicket('Last', null, null)).id).toBe(`TL-${generatedNumberMax}`);
		await expectRefused(api.createTicket('None left', null, null), 'ticket_limit');
	});

	it('trims only ASCII whitespace, keeping other Unicode spaces', async () => {
		const { api } = freshApi();
		expect((await api.createTicket('\u00a0x\u00a0', null, null)).name).toBe('\u00a0x\u00a0');
	});

	it('takes exactly textCharsMax characters of name and refuses one more', async () => {
		const { api } = freshApi();
		await api.createTicket('é'.repeat(textCharsMax), null, null);
		await expectRefused(api.createTicket('é'.repeat(textCharsMax) + 'x', null, null), 'too_long');
	});

	it.each([
		['a malformed parent ID', 'TL-0', 'invalid_id'],
		['a typed parent ID', 'DEV-1234', 'invalid_id'],
		['a parent not on the board', 'TL-5555', 'not_found']
	] satisfies [string, string, ApiErrorCode][])(
		'refuses %s',
		async (_description, parent, code) => {
			const { api } = freshApi();
			await expectRefused(api.createTicket('Name', null, parent), code);
		}
	);

	it('refuses a blank name and a bad schedule', async () => {
		const { api } = freshApi();
		await expectRefused(api.createTicket(' \t\r\n ', null, null), 'blank');
		await expectRefused(api.createTicket('Name', backwards, null), 'bad_schedule');
		await expectRefused(
			api.createTicket('Name', { start: '2026-02-30', due: '2026-03-01' }, null),
			'bad_schedule'
		);
	});

	it('refuses each rule in the order the Api gives', async () => {
		const { api } = freshApi();
		const long = 'é'.repeat(textCharsMax + 1);
		await expectRefused(api.createTicket('', backwards, 'TL-0'), 'invalid_id');
		await expectRefused(api.createTicket('', backwards, 'TL-5555'), 'not_found');
		await expectRefused(api.createTicket('', backwards, 'TL-24'), 'blank');
		await expectRefused(api.createTicket(long, backwards, 'TL-118'), 'too_long');
		await expectRefused(api.createTicket('x', backwards, 'TL-118'), 'bad_schedule');
		await expectRefused(api.createTicket('x', null, 'TL-24'), 'sub_ticket_limit');
		await expectRefused(api.createTicket('x', null, 'TL-118'), 'depth_limit');
	});

	it('refuses the ticket after ticketsMax, at any level', async () => {
		const { api } = freshApi();
		const seeded = (await api.listTickets()).length;
		for (let count = seeded; count < ticketsMax; count += 1) {
			await api.createTicket('Filler', null, null);
		}
		expect(await api.listTickets()).toHaveLength(ticketsMax);
		await expectRefused(api.createTicket('One too many', null, null), 'ticket_limit');
		await expectRefused(api.createTicket('One too many', null, 'TL-17'), 'ticket_limit');
		// ticket_limit comes before sub_ticket_limit and depth_limit.
		await expectRefused(api.createTicket('Full', null, 'TL-24'), 'ticket_limit');
		await expectRefused(api.createTicket('Deep', null, 'TL-118'), 'ticket_limit');
		await api.removeTicket('TL-17');
		expect((await api.createTicket('Fits again', null, null)).parent).toBeNull();
	});

	it('refuses a sub-ticket past subTicketsMax under one ticket, but not under its sub-tickets', async () => {
		const { api } = freshApi();
		expect(childrenOf(await api.listTickets(), 'TL-24')).toHaveLength(subTicketsMax);
		await expectRefused(api.createTicket('One too many', null, 'TL-24'), 'sub_ticket_limit');
		expect((await api.createTicket('Under a part', null, 'TL-26')).parent).toBe('TL-26');
	});

	it('nests a sub-ticket at depthMax, and refuses one deeper', async () => {
		const { api } = freshApi();
		// TL-117 is at depth 31 and TL-118 at depth 32.
		expect((await api.createTicket('At the limit', null, 'TL-117')).parent).toBe('TL-117');
		await expectRefused(api.createTicket('Too deep', null, 'TL-118'), 'depth_limit');
	});

	it('fails a request no typed page could send as malformed, before any refusal', async () => {
		const { api } = freshApi();
		// @ts-expect-error A typed page can't send this; the API must still refuse it.
		await expectMalformed(api.createTicket(42, null, null));
		// @ts-expect-error A typed page can't send this; the API must still refuse it.
		await expectMalformed(api.createTicket('Name', { start: '2026-11-03' }, null));
		// @ts-expect-error A typed page can't send this; the API must still refuse it.
		await expectMalformed(api.createTicket('Name', null, 42));
		// @ts-expect-error A typed page can't send this; the API must still refuse it.
		await expectMalformed(api.createTicket(undefined, backwards, 'TL-5555'));
		// @ts-expect-error A typed page can't send this; the API must still refuse it.
		await expectMalformed(api.createTicket('', backwards, undefined));
	});
});

describe('schedules passed in', () => {
	it("stores a copy, so changing the caller's object later changes nothing", async () => {
		const { api } = freshApi();
		const schedule = { start: '2026-11-03', due: '2026-11-04' };
		await api.setSchedule('TL-17', schedule);
		schedule.due = '2000-01-01';
		expect((await findTicket(api, 'TL-17'))?.schedule).toEqual({
			start: '2026-11-03',
			due: '2026-11-04'
		});
	});

	it('accepts a proxy, as Svelte state passes one', async () => {
		const { api } = freshApi();
		const schedule = new Proxy({ start: '2026-11-03', due: '2026-11-04' }, {});
		expect((await api.createTicket('From state', schedule, null)).schedule).toEqual({
			start: '2026-11-03',
			due: '2026-11-04'
		});
	});

	it('keeps only the two dates', async () => {
		const { api } = freshApi();
		const schedule = { start: '2026-11-03', due: '2026-11-04', note: 'extra' };
		expect((await api.setSchedule('TL-17', schedule)).schedule).toEqual({
			start: '2026-11-03',
			due: '2026-11-04'
		});
	});
});

describe('renameTicket and setSchedule', () => {
	it('rename and reschedule a ticket at any level', async () => {
		const { api } = freshApi();
		expect((await api.renameTicket('TL-1', '  Renamed ')).name).toBe('Renamed');
		expect(await api.renameTicket('TL-118', 'Deepest')).toEqual({
			...(await findTicket(api, 'TL-118')),
			name: 'Deepest'
		});
		const schedule = { start: '2026-12-01', due: '2026-12-01' };
		expect((await api.setSchedule('TL-6', schedule)).schedule).toEqual(schedule);
		expect((await api.setSchedule('TL-6', null)).schedule).toBeNull();
	});

	it('takes exactly textCharsMax characters and refuses one more', async () => {
		const { api } = freshApi();
		expect((await api.renameTicket('TL-6', 'é'.repeat(textCharsMax))).name).toBe(
			'é'.repeat(textCharsMax)
		);
		await expectRefused(api.renameTicket('TL-6', 'é'.repeat(textCharsMax + 1)), 'too_long');
	});

	it('refuses a malformed ID before an unknown one, and an unknown one before bad text', async () => {
		const { api } = freshApi();
		await expectRefused(api.renameTicket('TL-01', ''), 'invalid_id');
		await expectRefused(api.renameTicket('TL-0', ''), 'invalid_id');
		await expectRefused(api.renameTicket('TL-5555', ''), 'not_found');
		await expectRefused(api.renameTicket('TL-5555', ''), 'not_found');
		await expectRefused(api.renameTicket('TL-1', ' '), 'blank');
		await expectRefused(api.setSchedule('TL-01', backwards), 'invalid_id');
		await expectRefused(api.setSchedule('TL-5555', backwards), 'not_found');
		await expectRefused(
			api.setSchedule('TL-1', { start: '2026-02-30', due: '2026-03-01' }),
			'bad_schedule'
		);
	});
});

describe('moveTicket', () => {
	it('moves a ticket to the top of another column, keeping its parent', async () => {
		const { api } = freshApi();
		const moved = await api.moveTicket('TL-8', 'done', 0);
		expect(moved.column).toBe('done');
		expect(moved.parent).toBeNull();
		expect(await columnIds(api, null, 'done')).toEqual(['TL-8', 'TL-18']);
	});

	it('moves a ticket to the bottom with an index equal to the column without it', async () => {
		const { api } = freshApi();
		await api.moveTicket('TL-8', 'in_progress', 2);
		expect(await columnIds(api, null, 'in_progress')).toEqual(['TL-1', 'TL-13', 'TL-8']);
	});

	it('reorders within a column, counting as if the ticket were already taken out', async () => {
		const { api } = freshApi();
		await api.moveTicket('TL-8', 'todo', 3);
		expect(await columnIds(api, null, 'todo')).toEqual(['TL-11', 'TL-17', 'TL-24', 'TL-8']);
		await api.moveTicket('TL-8', 'todo', 0);
		expect(await columnIds(api, null, 'todo')).toEqual(['TL-8', 'TL-11', 'TL-17', 'TL-24']);
	});

	it('moves a sub-ticket among its siblings only, under the same parent', async () => {
		const { api } = freshApi();
		// Under TL-1, Done holds TL-2 and TL-3; other parents' Done tickets don't count.
		await api.moveTicket('TL-7', 'done', 2);
		expect(await columnIds(api, 'TL-1', 'done')).toEqual(['TL-2', 'TL-3', 'TL-7']);
		const moved = await api.moveTicket('TL-7', 'done', 0);
		expect(moved).toMatchObject({ id: 'TL-7', column: 'done', parent: 'TL-1' });
		expect(await columnIds(api, 'TL-1', 'done')).toEqual(['TL-7', 'TL-2', 'TL-3']);
		await expectRefused(api.moveTicket('TL-7', 'done', 3), 'bad_position');
	});

	it('repeats a move without changing anything', async () => {
		const { api } = freshApi();
		await api.moveTicket('TL-8', 'done', 1);
		const once = await api.listTickets();
		await api.moveTicket('TL-8', 'done', 1);
		expect(await api.listTickets()).toEqual(once);
	});

	it('refuses a whole-number index outside the siblings in the column', async () => {
		const { api } = freshApi();
		await expectRefused(api.moveTicket('TL-8', 'done', -1), 'bad_position');
		// Done holds many sub-tickets, but only TL-18 at the top level.
		await expectRefused(api.moveTicket('TL-8', 'done', 2), 'bad_position');
		await expectRefused(api.moveTicket('TL-8', 'todo', 4), 'bad_position');
		await expectRefused(api.moveTicket('TL-8', 'backlog', 2), 'bad_position');
		expect((await api.moveTicket('TL-8', 'backlog', 1)).column).toBe('backlog');
	});

	it('refuses a malformed ID before an unknown one, and both before a bad position', async () => {
		const { api } = freshApi();
		await expectRefused(api.moveTicket('TL-01', 'done', 99), 'invalid_id');
		await expectRefused(api.moveTicket('TL-5555', 'done', 99), 'not_found');
	});

	it('fails an index that is not a safe whole number, or an unknown column, as malformed', async () => {
		const { api } = freshApi();
		await expectMalformed(api.moveTicket('TL-8', 'done', 1e300));
		await expectMalformed(api.moveTicket('TL-8', 'done', 1.5));
		await expectMalformed(api.moveTicket('TL-8', 'done', Number.NaN));
		// @ts-expect-error A typed page can't send this; the API must still refuse it.
		await expectMalformed(api.moveTicket('TL-8', 'blocked', 0));
	});

	it('keeps the new order after a reload', async () => {
		const { api, storage } = freshApi();
		await api.moveTicket('TL-18', 'todo', 0);
		expect(await columnIds(createFakeApi(storage, today, clock), null, 'todo')).toEqual([
			'TL-18',
			'TL-8',
			'TL-11',
			'TL-17',
			'TL-24'
		]);
	});
});

describe('removeTicket', () => {
	it('removes a ticket with no sub-tickets, and the removal is kept after a reload', async () => {
		const { api, storage } = freshApi();
		await api.removeTicket('TL-17');
		await api.removeTicket('TL-118');
		const again = createFakeApi(storage, today, clock);
		const ids = (await again.listTickets()).map((each) => each.id);
		expect(ids).not.toContain('TL-17');
		expect(ids).not.toContain('TL-118');
		expect(ids).toHaveLength(seedTickets(today).length - 2);
	});

	it('refuses a ticket that has sub-tickets, until they are gone', async () => {
		const { api } = freshApi();
		await expectRefused(api.removeTicket('TL-21'), 'has_sub_tickets');
		await expectRefused(api.removeTicket('TL-4'), 'has_sub_tickets');
		await api.removeTicket('TL-22');
		await expectRefused(api.removeTicket('TL-21'), 'has_sub_tickets');
		await api.removeTicket('TL-23');
		await api.removeTicket('TL-21');
		expect(await findTicket(api, 'TL-21')).toBeUndefined();
	});

	it('refuses a malformed ID before an unknown one, and an unknown one', async () => {
		const { api } = freshApi();
		await expectRefused(api.removeTicket('TL-0'), 'invalid_id');
		await expectRefused(api.removeTicket('TL-5555'), 'not_found');
		await api.removeTicket('TL-17');
		await expectRefused(api.removeTicket('TL-17'), 'not_found');
	});
});

describe('malformed requests', () => {
	// Each uses an ID that is also invalid, to prove malformed is decided first.
	it('are refused as malformed before any API error, in every function', async () => {
		const { api } = freshApi();
		// @ts-expect-error A typed page can't send this; the API must still refuse it.
		await expectMalformed(api.createTicket('nope', 7, null, null));
		// @ts-expect-error A typed page can't send this; the API must still refuse it.
		await expectMalformed(api.renameTicket('nope', 42));
		// @ts-expect-error A typed page can't send this; the API must still refuse it.
		await expectMalformed(api.renameTicket(42, ''));
		// @ts-expect-error A typed page can't send this; the API must still refuse it.
		await expectMalformed(api.setSchedule('nope', { start: 1 }));
		// @ts-expect-error A typed page can't send this; the API must still refuse it.
		await expectMalformed(api.setSchedule(1, null));
		await expectMalformed(api.moveTicket('nope', 'done', 1.5));
		// @ts-expect-error A typed page can't send this; the API must still refuse it.
		await expectMalformed(api.moveTicket(1, 'done', 0));
		// @ts-expect-error A typed page can't send this; the API must still refuse it.
		await expectMalformed(api.removeTicket(1));
	});
});

describe('setDescription', () => {
	it('keeps line breaks, trims the ends, and is kept after a reload', async () => {
		const storage = new MemoryStorage();
		const api = createFakeApi(storage, today, clock);
		const changed = await api.setDescription('TL-17', '  First line\nSecond line \n');
		expect(changed.description).toBe('First line\nSecond line');
		const again = createFakeApi(storage, today, clock);
		const reloaded = (await again.listTickets()).find((ticket) => ticket.id === 'TL-17');
		expect(reloaded?.description).toBe('First line\nSecond line');
	});

	it('clears it when only spaces are left', async () => {
		const api = createFakeApi(new MemoryStorage(), today, clock);
		expect((await api.setDescription('TL-1', ' \n ')).description).toBe('');
	});

	it(`takes exactly ${descriptionCharsMax} characters and refuses one more`, async () => {
		const api = createFakeApi(new MemoryStorage(), today, clock);
		// One code point but two UTF-16 units, so a unit count would refuse it at half the limit.
		const longest = '𝄞'.repeat(descriptionCharsMax);
		expect((await api.setDescription('TL-17', longest)).description).toBe(longest);
		await expect(api.setDescription('TL-17', longest + 'x')).rejects.toEqual(
			new ApiError('too_long')
		);
	});

	it('refuses a ticket that is not there, and a description that is not text', async () => {
		const api = createFakeApi(new MemoryStorage(), today, clock);
		await expect(api.setDescription('TL-5555', 'x')).rejects.toEqual(new ApiError('not_found'));
		// @ts-expect-error A typed page can't send a number.
		await expect(api.setDescription('TL-17', 7)).rejects.toBeInstanceOf(MalformedRequest);
	});
});

describe('loading a board saved before descriptions', () => {
	it('gives its tickets empty descriptions instead of calling it unreadable', async () => {
		const storage = new MemoryStorage();
		const old = {
			id: 'TL-7',
			name: 'Saved earlier',
			column: 'done',
			schedule: null,
			parent: null
		};
		storage.items.set(storageKey, JSON.stringify({ tickets: [old], generatedNumberNext: 8 }));
		const tickets = await createFakeApi(storage, today, clock).listTickets();
		expect(tickets).toEqual([{ ...old, description: '' }]);
	});

	it.each([
		['not text', 7],
		['with spaces at an end', ' padded'],
		['too long', 'x'.repeat(descriptionCharsMax + 1)]
	])('still refuses a saved description %s', (_why, description) => {
		const storage = new MemoryStorage();
		const bad = {
			id: 'TL-7',
			name: 'Bad',
			column: 'done',
			schedule: null,
			parent: null,
			description
		};
		storage.items.set(storageKey, JSON.stringify({ tickets: [bad], generatedNumberNext: 8 }));
		expect(() => createFakeApi(storage, today, clock)).toThrow(UnreadableBoard);
	});
});

describe('comments', () => {
	it('lists the seed comments oldest first', async () => {
		const { api } = freshApi();
		const comments = await api.listComments();
		expect(comments.map((comment) => comment.id)).toEqual(['C-1', 'C-2', 'C-3', 'C-4']);
		expect(comments.map((comment) => comment.at)).toEqual(
			comments.map((comment) => comment.at).toSorted()
		);
	});

	it("adds one with the next ID, trimmed, stamped with the API's clock, kept after a reload", async () => {
		const { api, storage } = freshApi();
		const added = await api.addComment('TL-17', '  Looks good\nShip it \n');
		expect(added).toEqual({
			id: 'C-5',
			ticketId: 'TL-17',
			text: 'Looks good\nShip it',
			at: '2026-11-03T09:00:00.000Z'
		});
		const again = createFakeApi(storage, today, clock);
		expect((await again.listComments()).at(-1)).toEqual(added);
	});

	it(`takes exactly ${commentCharsMax} characters and refuses one more`, async () => {
		const { api } = freshApi();
		const longest = '𝄞'.repeat(commentCharsMax);
		expect((await api.addComment('TL-17', longest)).text).toBe(longest);
		await expectRefused(api.addComment('TL-17', longest + 'x'), 'too_long');
	});

	it('refuses a blank comment, a missing ticket and a malformed ID, in the contract order', async () => {
		const { api } = freshApi();
		await expectRefused(api.addComment('TL-17', ' \n '), 'blank');
		await expectRefused(api.addComment('TL-5555', 'x'), 'not_found');
		await expectRefused(api.addComment('dev-1', ' '), 'invalid_id');
		await expectRefused(api.addComment('TL-5555', ' '), 'not_found');
		await expectRefused(
			api.addComment('TL-17', ' '.repeat(3) + '𝄞'.repeat(commentCharsMax + 1)),
			'too_long'
		);
		// @ts-expect-error A typed page can't send a number.
		await expectMalformed(api.addComment('TL-17', 7));
	});

	it('removes one, refusing a malformed or missing ID, and never reuses its number', async () => {
		const { api, storage } = freshApi();
		await api.removeComment('C-4');
		await expectRefused(api.removeComment('C-4'), 'not_found');
		await expectRefused(api.removeComment('c-4'), 'invalid_id');
		expect((await api.addComment('TL-17', 'Next')).id).toBe('C-5');
		const again = createFakeApi(storage, today, clock);
		expect((await again.listComments()).map((comment) => comment.id)).toEqual([
			'C-1',
			'C-2',
			'C-3',
			'C-5'
		]);
	});

	it('removes a ticket with its comments', async () => {
		const { api } = freshApi();
		await api.removeTicket('TL-6');
		expect((await api.listComments()).map((comment) => comment.ticketId)).not.toContain('TL-6');
	});

	it('loads a board saved before comments with none, numbering from C-1', async () => {
		const storage = new MemoryStorage();
		const old = {
			id: 'TL-7',
			name: 'Saved earlier',
			column: 'done',
			schedule: null,
			parent: null,
			description: ''
		};
		storage.items.set(storageKey, JSON.stringify({ tickets: [old], generatedNumberNext: 8 }));
		const api = createFakeApi(storage, today, clock);
		expect(await api.listComments()).toEqual([]);
		expect((await api.addComment('TL-7', 'First')).id).toBe('C-1');
	});

	it.each([
		['with a malformed ID', { id: 'c-1' }],
		['on a ticket that is not there', { ticketId: 'TL-404' }],
		['with padded text', { text: ' padded' }],
		['with blank text', { text: '' }],
		['with a time that is not one', { at: 'yesterday' }]
	])('refuses a saved comment %s', (_why, change) => {
		const storage = new MemoryStorage();
		const owner = {
			id: 'TL-7',
			name: 'Owner',
			column: 'done',
			schedule: null,
			parent: null,
			description: ''
		};
		const comment = {
			id: 'C-1',
			ticketId: 'TL-7',
			text: 'Fine',
			at: '2026-11-03T09:00:00.000Z',
			...change
		};
		storage.items.set(
			storageKey,
			JSON.stringify({
				tickets: [owner],
				generatedNumberNext: 8,
				comments: [comment],
				commentNumberNext: 2
			})
		);
		expect(() => createFakeApi(storage, today, clock)).toThrow(UnreadableBoard);
	});

	// A saved board with one ticket and `count` comments on it.
	function boardWithComments(count: number, commentNumberNext = count + 1) {
		const storage = new MemoryStorage();
		const owner = {
			id: 'TL-7',
			name: 'Owner',
			column: 'done',
			schedule: null,
			parent: null,
			description: ''
		};
		const comments = Array.from({ length: count }, (_unused, index) => ({
			id: `C-${index + 1}`,
			ticketId: 'TL-7',
			text: 'Fine',
			at: '2026-11-03T09:00:00.000Z'
		}));
		storage.items.set(
			storageKey,
			JSON.stringify({ tickets: [owner], generatedNumberNext: 8, comments, commentNumberNext })
		);
		return storage;
	}

	it(`takes the ${commentsMax}th comment and refuses one more, after the other checks`, async () => {
		const api = createFakeApi(boardWithComments(commentsMax - 1), today, clock);
		expect((await api.addComment('TL-7', 'Last')).id).toBe(`C-${commentsMax}`);
		await expectRefused(api.addComment('TL-7', ' '), 'blank');
		await expectRefused(api.addComment('TL-7', 'One more'), 'comment_limit');
	});

	it('refuses a comment once the numbers have run out', async () => {
		const api = createFakeApi(boardWithComments(0, generatedNumberMax + 1), today, clock);
		await expectRefused(api.addComment('TL-7', 'Too late'), 'comment_limit');
	});

	it(`refuses a saved board with more than ${commentsMax} comments`, () => {
		expect(() => createFakeApi(boardWithComments(commentsMax + 1), today, clock)).toThrow(
			UnreadableBoard
		);
	});

	it.each([
		['too long', { text: 'x'.repeat(commentCharsMax + 1) }],
		['with a time not in the form toISOString writes', { at: '2026-11-03T09:00:00Z' }]
	])('refuses a saved comment %s', (_why, change) => {
		const storage = new MemoryStorage();
		const owner = {
			id: 'TL-7',
			name: 'Owner',
			column: 'done',
			schedule: null,
			parent: null,
			description: ''
		};
		const comment = {
			id: 'C-1',
			ticketId: 'TL-7',
			text: 'Fine',
			at: '2026-11-03T09:00:00.000Z',
			...change
		};
		storage.items.set(
			storageKey,
			JSON.stringify({
				tickets: [owner],
				generatedNumberNext: 8,
				comments: [comment],
				commentNumberNext: 2
			})
		);
		expect(() => createFakeApi(storage, today, clock)).toThrow(UnreadableBoard);
	});

	it('refuses saved comments with the same ID twice, or without a next number', () => {
		const twice = boardWithComments(2);
		const saved = JSON.parse(twice.items.get(storageKey) ?? '{}');
		saved.comments[1].id = 'C-1';
		twice.items.set(storageKey, JSON.stringify(saved));
		expect(() => createFakeApi(twice, today, clock)).toThrow(UnreadableBoard);
		const unnumbered = boardWithComments(1);
		const other = JSON.parse(unnumbered.items.get(storageKey) ?? '{}');
		delete other.commentNumberNext;
		unnumbered.items.set(storageKey, JSON.stringify(other));
		expect(() => createFakeApi(unnumbered, today, clock)).toThrow(UnreadableBoard);
	});

	it('refuses a saved comment count that is not above every number used', () => {
		const storage = new MemoryStorage();
		const owner = {
			id: 'TL-7',
			name: 'Owner',
			column: 'done',
			schedule: null,
			parent: null,
			description: ''
		};
		const comment = { id: 'C-3', ticketId: 'TL-7', text: 'Fine', at: '2026-11-03T09:00:00.000Z' };
		storage.items.set(
			storageKey,
			JSON.stringify({
				tickets: [owner],
				generatedNumberNext: 8,
				comments: [comment],
				commentNumberNext: 3
			})
		);
		expect(() => createFakeApi(storage, today, clock)).toThrow(UnreadableBoard);
	});
});
