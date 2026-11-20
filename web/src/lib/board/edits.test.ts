import { describe, expect, it } from 'vitest';
import type { Api } from '../api';
import { createFakeApi } from '../fake-api';
import { childrenOf } from '../tickets';
import type { ApiErrorCode, Column, Ticket } from '../types';
import { ApiError, depthMax, subTicketsMax, textCharsMax, ticketsMax } from '../types';
import { readSchedule } from './dates';
import type { Edit } from './edits';
import { failureMessage, isPageFault, send } from './edits';

const today = '2026-11-03';

function freshApi(): Api {
	const items = new Map<string, string>();
	return createFakeApi(
		{
			getItem: (key) => items.get(key) ?? null,
			setItem: (key, value) => void items.set(key, value)
		},
		today,
		() => new Date('2026-11-03T09:00:00Z')
	);
}

describe('send', () => {
	// The board after `send` applies its change locally must match the Api's own
	// board, so the page never drifts from the server.
	async function expectMatchesApi(edit: Edit): Promise<Ticket[]> {
		const api = freshApi();
		const before = { tickets: await api.listTickets(), comments: await api.listComments() };
		const apply = await send(api, edit);
		const after = apply(before);
		expect(after).toEqual({ tickets: await api.listTickets(), comments: await api.listComments() });
		return after.tickets;
	}

	function columnIds(board: Ticket[], parent: string | null, column: Column): string[] {
		return childrenOf(board, parent)
			.filter((ticket) => ticket.column === column)
			.map((ticket) => ticket.id);
	}

	it('appends a created ticket, at the top level or under a parent', async () => {
		const top = await expectMatchesApi({
			kind: 'createTicket',
			name: 'New',
			schedule: null,
			parent: null
		});
		expect(top.at(-1)).toMatchObject({ id: 'TL-120', parent: null });
		const under = await expectMatchesApi({
			kind: 'createTicket',
			name: 'New',
			schedule: null,
			parent: 'TL-21'
		});
		expect(under.at(-1)).toMatchObject({ id: 'TL-120', parent: 'TL-21' });
	});

	it('replaces a renamed or rescheduled ticket where it was', async () => {
		const renamed = await expectMatchesApi({
			kind: 'renameTicket',
			ticketId: 'TL-1',
			name: 'Renamed'
		});
		expect(renamed[0]?.name).toBe('Renamed');
		const schedule = { start: '2026-12-01', due: '2026-12-02' };
		const rescheduled = await expectMatchesApi({
			kind: 'setSchedule',
			ticketId: 'TL-6',
			schedule
		});
		expect(rescheduled.find((ticket) => ticket.id === 'TL-6')?.schedule).toEqual(schedule);
	});

	it.each([
		[0, ['TL-8', 'TL-18']],
		[1, ['TL-18', 'TL-8']]
	])('places a ticket moved to Done at index %i, as the Api does', async (index, expected) => {
		const board = await expectMatchesApi({
			kind: 'moveTicket',
			ticketId: 'TL-8',
			column: 'done',
			index
		});
		expect(columnIds(board, null, 'done')).toEqual(expected);
	});

	it('reorders within a column, counting as if the ticket were already taken out', async () => {
		const board = await expectMatchesApi({
			kind: 'moveTicket',
			ticketId: 'TL-8',
			column: 'todo',
			index: 3
		});
		expect(columnIds(board, null, 'todo')).toEqual(['TL-11', 'TL-17', 'TL-24', 'TL-8']);
	});

	it('places a moved sub-ticket among its siblings only', async () => {
		const board = await expectMatchesApi({
			kind: 'moveTicket',
			ticketId: 'TL-7',
			column: 'done',
			index: 1
		});
		expect(columnIds(board, 'TL-1', 'done')).toEqual(['TL-2', 'TL-7', 'TL-3']);
	});

	it('filters out a removed ticket', async () => {
		const board = await expectMatchesApi({ kind: 'removeTicket', ticketId: 'TL-6' });
		expect(board.some((ticket) => ticket.id === 'TL-6')).toBe(false);
	});

	it("adds and removes comments, and takes a removed ticket's comments with it", async () => {
		await expectMatchesApi({ kind: 'addComment', ticketId: 'TL-17', text: 'Noted' });
		await expectMatchesApi({ kind: 'removeComment', commentId: 'C-2' });
		const api = freshApi();
		const before = { tickets: await api.listTickets(), comments: await api.listComments() };
		const after = (await send(api, { kind: 'removeTicket', ticketId: 'TL-6' }))(before);
		expect(after.comments.map((comment) => comment.ticketId)).not.toContain('TL-6');
		expect(after.comments).toEqual(await api.listComments());
	});

	it('rejects with the refusal, changing nothing', async () => {
		const api = freshApi();
		const before = await api.listTickets();
		await expect(send(api, { kind: 'removeTicket', ticketId: 'TL-1' })).rejects.toEqual(
			new ApiError('has_sub_tickets')
		);
		expect(await api.listTickets()).toEqual(before);
	});
});

describe('failureMessage', () => {
	// A part of each message, so a test fails if a code loses its own wording.
	const fragments: Record<ApiErrorCode, string> = {
		invalid_id: 'ticket ID',
		not_found: 'no longer on the board',
		blank: 'blank',
		too_long: `${textCharsMax} characters`,
		bad_schedule: 'start on or before the due date',
		bad_position: "move didn't work",
		has_sub_tickets: 'still has sub-tickets',
		comment_limit: 'comments',
		ticket_limit: `${ticketsMax} tickets`,
		sub_ticket_limit: `${subTicketsMax} sub-tickets`,
		depth_limit: `${depthMax} levels`
	};
	const codes: ApiErrorCode[] = [
		'invalid_id',
		'not_found',
		'blank',
		'too_long',
		'bad_schedule',
		'bad_position',
		'has_sub_tickets',
		'ticket_limit',
		'sub_ticket_limit',
		'depth_limit',
		'comment_limit'
	];

	it('lists every code', () => {
		expect(codes.toSorted()).toEqual(Object.keys(fragments).toSorted());
	});

	it.each(codes)('explains %s in its own plain words', (code) => {
		expect(failureMessage(new ApiError(code))).toContain(fragments[code]);
	});

	it('gives every code a different message', () => {
		const messages = codes.map((code) => failureMessage(new ApiError(code)));
		expect(new Set(messages).size).toBe(codes.length);
	});

	it('says something went wrong for anything else', () => {
		expect(failureMessage(new Error('down'))).toBe(
			'Something went wrong, and the change was not saved.'
		);
		expect(failureMessage('not even an error')).toBe(
			'Something went wrong, and the change was not saved.'
		);
	});
});

describe('isPageFault', () => {
	it('treats invalid_id, bad_position and anything that is not a refusal as page faults', () => {
		expect(isPageFault(new ApiError('invalid_id'))).toBe(true);
		expect(isPageFault(new ApiError('bad_position'))).toBe(true);
		expect(isPageFault(new Error('down'))).toBe(true);
	});

	it.each<ApiErrorCode>(['blank', 'not_found', 'has_sub_tickets', 'depth_limit'])(
		"treats %s as the user's",
		(code) => {
			expect(isPageFault(new ApiError(code))).toBe(false);
		}
	);
});

describe('readSchedule', () => {
	it('reads both empty as no schedule, and both filled as that schedule', () => {
		expect(readSchedule('', '')).toEqual({ schedule: null });
		expect(readSchedule('2026-11-03', '2026-11-04')).toEqual({
			schedule: { start: '2026-11-03', due: '2026-11-04' }
		});
	});

	it('gives null when only one date is filled', () => {
		expect(readSchedule('2026-11-03', '')).toBeNull();
		expect(readSchedule('', '2026-11-04')).toBeNull();
	});
});
