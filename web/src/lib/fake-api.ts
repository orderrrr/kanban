import type { Api } from './api';
import { seedComments, seedTickets } from './seed';
import { childrenOf, placeAt, trailTo } from './tickets';
import type { IsoDate, Schedule, Ticket, TicketComment } from './types';
import {
	ApiError,
	charCount,
	columns,
	commentCharsMax,
	commentNumber,
	commentsMax,
	depthMax,
	descriptionCharsMax,
	generatedNumber,
	generatedNumberMax,
	isSchedule,
	isCommentId,
	isTicketId,
	subTicketsMax,
	textCharsMax,
	ticketsMax
} from './types';

// Where the board is kept between visits. Only `getItem` and `setItem` are
// needed, so tests can pass a plain in-memory stand-in for `localStorage`.
export type BoardStorage = Pick<Storage, 'getItem' | 'setItem'>;

// Boards saved before IDs were only generated used `ticket-board`; they are
// left there unread and never overwritten, so the page starts with the seed.
export const storageKey = 'kanban-board';

// What is saved: every ticket in board order, every comment oldest first, and
// the numbers the next generated ticket and comment IDs will get. The page
// never sees the numbers.
interface Board {
	tickets: Ticket[];
	generatedNumberNext: number;
	comments: TicketComment[];
	commentNumberNext: number;
}

// A request no typed page could send: a fault in the client, not the user's
// input, so it is not an `ApiError`.
export class MalformedRequest extends Error {
	constructor(what: string) {
		super(`malformed request: ${what}`);
		this.name = 'MalformedRequest';
	}
}

// A saved board that isn't a board this code could have written. It is kept,
// never replaced by the seed, so no work is lost.
export class UnreadableBoard extends Error {
	constructor(why: string) {
		super(`the saved board is unreadable: ${why}`);
		this.name = 'UnreadableBoard';
	}
}

// An `Api` that keeps the board in the browser, standing in for the server.
// It reads the saved board once, or seeds one for `today` on the first visit.
// `now` gives the time a comment is written, as the server's clock would.
export function createFakeApi(storage: BoardStorage, today: IsoDate, now: () => Date): Api {
	let board = load(storage, today);

	// Every change makes a new board and saves it before keeping it, so a failed
	// save leaves the board as it was.
	function keep(next: Board): void {
		storage.setItem(storageKey, JSON.stringify(next));
		board = next;
	}

	// Replaces one ticket and gives back a copy of it.
	function update(id: string, change: (ticket: Ticket) => Ticket): Ticket {
		const updated = change(findTicket(board, id));
		const tickets = board.tickets.map((ticket) => (ticket.id === id ? updated : ticket));
		keep({ ...board, tickets });
		return structuredClone(updated);
	}

	return {
		async listTickets() {
			return structuredClone(board.tickets);
		},

		async createTicket(name, schedule, parent) {
			requireString(name, 'name');
			const copy = copySchedule(schedule);
			if (parent !== null) requireString(parent, 'parent');
			if (parent !== null) findTicket(board, parent);
			const text = cleanText(name);
			if (!isSchedule(copy)) throw new ApiError('bad_schedule');
			const number = board.generatedNumberNext;
			if (board.tickets.length >= ticketsMax || number > generatedNumberMax) {
				throw new ApiError('ticket_limit');
			}
			if (parent !== null) {
				if (childrenOf(board.tickets, parent).length >= subTicketsMax) {
					throw new ApiError('sub_ticket_limit');
				}
				if (trailTo(board.tickets, parent).length >= depthMax) throw new ApiError('depth_limit');
			}
			const ticket: Ticket = {
				id: `TL-${number}`,
				name: text,
				column: 'backlog',
				schedule: copy,
				parent,
				description: ''
			};
			keep({
				...board,
				tickets: [...board.tickets, ticket],
				generatedNumberNext: number + 1
			});
			return structuredClone(ticket);
		},

		async renameTicket(id, name) {
			requireString(id, 'id');
			requireString(name, 'name');
			findTicket(board, id);
			const text = cleanText(name);
			return update(id, (ticket) => ({ ...ticket, name: text }));
		},

		async setDescription(id, description) {
			requireString(id, 'id');
			requireString(description, 'description');
			findTicket(board, id);
			const text = trimText(description);
			if (charCount(text) > descriptionCharsMax) throw new ApiError('too_long');
			return update(id, (ticket) => ({ ...ticket, description: text }));
		},

		async setSchedule(id, schedule) {
			requireString(id, 'id');
			const copy = copySchedule(schedule);
			findTicket(board, id);
			if (!isSchedule(copy)) throw new ApiError('bad_schedule');
			return update(id, (ticket) => ({ ...ticket, schedule: copy }));
		},

		async moveTicket(id, column, index) {
			requireString(id, 'id');
			if (!columns.some((known) => known === column)) throw new MalformedRequest('unknown column');
			requireIndex(index);
			const ticket = findTicket(board, id);
			const others = childrenOf(board.tickets, ticket.parent).filter(
				(other) => other.column === column && other.id !== id
			);
			if (index < 0 || index > others.length) throw new ApiError('bad_position');
			const tickets = placeAt(board.tickets, ticket, column, index);
			keep({ ...board, tickets });
			return structuredClone(findTicket({ ...board, tickets }, id));
		},

		async removeTicket(id) {
			requireString(id, 'id');
			findTicket(board, id);
			if (childrenOf(board.tickets, id).length > 0) throw new ApiError('has_sub_tickets');
			keep({
				...board,
				tickets: board.tickets.filter((ticket) => ticket.id !== id),
				comments: board.comments.filter((comment) => comment.ticketId !== id)
			});
		},

		async listComments() {
			return structuredClone(board.comments);
		},

		async addComment(ticketId, text) {
			requireString(ticketId, 'ticketId');
			requireString(text, 'text');
			findTicket(board, ticketId);
			const trimmed = trimText(text);
			if (trimmed === '') throw new ApiError('blank');
			if (charCount(trimmed) > commentCharsMax) throw new ApiError('too_long');
			const number = board.commentNumberNext;
			if (board.comments.length >= commentsMax || number > generatedNumberMax) {
				throw new ApiError('comment_limit');
			}
			const comment: TicketComment = {
				id: `C-${number}`,
				ticketId,
				text: trimmed,
				at: now().toISOString()
			};
			keep({ ...board, comments: [...board.comments, comment], commentNumberNext: number + 1 });
			return structuredClone(comment);
		},

		async removeComment(id) {
			requireString(id, 'id');
			if (!isCommentId(id)) throw new ApiError('invalid_id');
			if (!board.comments.some((comment) => comment.id === id)) throw new ApiError('not_found');
			keep({ ...board, comments: board.comments.filter((comment) => comment.id !== id) });
		}
	};
}

function load(storage: BoardStorage, today: IsoDate): Board {
	const saved = storage.getItem(storageKey);
	if (saved === null) {
		const tickets = seedTickets(today);
		const comments = seedComments(today);
		const board: Board = {
			tickets,
			generatedNumberNext: generatedNumberHighest(tickets) + 1,
			comments,
			commentNumberNext: commentNumberHighest(comments) + 1
		};
		storage.setItem(storageKey, JSON.stringify(board));
		return board;
	}
	let parsed: unknown;
	try {
		parsed = JSON.parse(saved);
	} catch {
		throw new UnreadableBoard('not JSON');
	}
	const upgraded = withComments(withDescriptions(parsed));
	if (!isBoard(upgraded)) throw new UnreadableBoard('not a board this code writes');
	return upgraded;
}

// Boards saved before comments existed get none; everything else is left for
// `isBoard` to judge.
function withComments(value: unknown): unknown {
	if (typeof value !== 'object' || value === null || 'comments' in value) return value;
	return { ...value, comments: [], commentNumberNext: 1 };
}

// Boards saved before tickets had descriptions get empty ones; everything else
// is left for `isBoard` to judge.
function withDescriptions(value: unknown): unknown {
	if (typeof value !== 'object' || value === null) return value;
	if (!('tickets' in value) || !Array.isArray(value.tickets)) return value;
	const tickets: unknown[] = value.tickets;
	return {
		...value,
		tickets: tickets.map((ticket) =>
			typeof ticket === 'object' && ticket !== null && !('description' in ticket)
				? { ...ticket, description: '' }
				: ticket
		)
	};
}

// Checks every ticket and how they nest against the contract, so a damaged save
// is reported here rather than breaking the page later.
function isBoard(value: unknown): value is Board {
	if (typeof value !== 'object' || value === null) return false;
	if (!('tickets' in value) || !Array.isArray(value.tickets)) return false;
	if (!('generatedNumberNext' in value)) return false;
	const next = value.generatedNumberNext;
	if (typeof next !== 'number' || !Number.isSafeInteger(next)) return false;
	const tickets: unknown[] = value.tickets;
	if (tickets.length > ticketsMax || !tickets.every(isTicket)) return false;
	if (new Set(tickets.map((ticket) => ticket.id)).size !== tickets.length) return false;
	if (next <= generatedNumberHighest(tickets)) return false;
	if (!hasComments(value, tickets)) return false;
	return tickets.every((ticket) => {
		if (childrenOf(tickets, ticket.id).length > subTicketsMax) return false;
		if (ticket.parent === null) return true;
		// `trailTo` stops at the depth limit, so a trail that doesn't reach the
		// top level means a missing parent, a loop, or nesting too deep.
		return trailTo(tickets, ticket.id)[0]?.parent === null;
	});
}

// Checks the saved comments: each well formed, on a ticket that is there, with
// unique IDs, and a next number above every one used.
function hasComments(value: object, tickets: Ticket[]): boolean {
	if (!('comments' in value) || !Array.isArray(value.comments)) return false;
	if (!('commentNumberNext' in value)) return false;
	const next = value.commentNumberNext;
	if (typeof next !== 'number' || !Number.isSafeInteger(next)) return false;
	const comments: unknown[] = value.comments;
	if (comments.length > commentsMax || !comments.every(isComment)) return false;
	if (new Set(comments.map((comment) => comment.id)).size !== comments.length) return false;
	if (next <= commentNumberHighest(comments)) return false;
	return comments.every((comment) => tickets.some((ticket) => ticket.id === comment.ticketId));
}

function isComment(value: unknown): value is TicketComment {
	if (typeof value !== 'object' || value === null) return false;
	if (!('id' in value) || typeof value.id !== 'string' || !isCommentId(value.id)) return false;
	if (!('ticketId' in value) || typeof value.ticketId !== 'string') return false;
	if (!('text' in value) || typeof value.text !== 'string') return false;
	const text = value.text;
	if (trimText(text) !== text || text === '' || charCount(text) > commentCharsMax) return false;
	if (!('at' in value) || typeof value.at !== 'string') return false;
	const at = new Date(value.at);
	return !Number.isNaN(at.getTime()) && at.toISOString() === value.at;
}

function commentNumberHighest(comments: TicketComment[]): number {
	return Math.max(0, ...comments.map((comment) => commentNumber(comment.id)));
}

function isTicket(value: unknown): value is Ticket {
	if (typeof value !== 'object' || value === null) return false;
	if (!('id' in value) || typeof value.id !== 'string' || !isTicketId(value.id)) return false;
	if (!('name' in value) || typeof value.name !== 'string' || !isCleanText(value.name))
		return false;
	if (!('column' in value) || !columns.some((column) => column === value.column)) return false;
	if (!('schedule' in value) || !isSavedSchedule(value.schedule)) return false;
	if (!('parent' in value)) return false;
	if (value.parent !== null && (typeof value.parent !== 'string' || !isTicketId(value.parent))) {
		return false;
	}
	if (!('description' in value) || typeof value.description !== 'string') return false;
	const description = value.description;
	return trimText(description) === description && charCount(description) <= descriptionCharsMax;
}

function isSavedSchedule(value: unknown): value is Schedule {
	if (value === null) return true;
	if (typeof value !== 'object') return false;
	if (!('start' in value) || typeof value.start !== 'string') return false;
	if (!('due' in value) || typeof value.due !== 'string') return false;
	return isSchedule({ start: value.start, due: value.due });
}

function generatedNumberHighest(tickets: Ticket[]): number {
	return Math.max(0, ...tickets.map((ticket) => generatedNumber(ticket.id) ?? 0));
}

// The ticket with `id`, refusing an ID that is malformed or not on the board.
function findTicket(board: Board, id: string): Ticket {
	if (!isTicketId(id)) throw new ApiError('invalid_id');
	const ticket = board.tickets.find((candidate) => candidate.id === id);
	if (ticket === undefined) throw new ApiError('not_found');
	return ticket;
}

// Trims ASCII space, tab, carriage return and line feed, never other Unicode
// spaces, then refuses blank or over-long text.
function cleanText(text: string): string {
	const trimmed = trimText(text);
	if (trimmed === '') throw new ApiError('blank');
	if (charCount(trimmed) > textCharsMax) throw new ApiError('too_long');
	return trimmed;
}

function trimText(text: string): string {
	return text.replace(/^[ \t\r\n]+|[ \t\r\n]+$/g, '');
}

// Text as `cleanText` would store it: already trimmed, not blank, not too long.
function isCleanText(text: string): boolean {
	return trimText(text) === text && text !== '' && charCount(text) <= textCharsMax;
}

function requireString(value: unknown, name: string): void {
	if (typeof value !== 'string') throw new MalformedRequest(`${name} is not a string`);
}

function requireIndex(index: unknown): void {
	if (!Number.isSafeInteger(index)) throw new MalformedRequest('index is not a safe whole number');
}

// A fresh copy holding only the two dates, so nothing the caller does to its
// own object afterwards (or a Svelte proxy) reaches the board.
function copySchedule(schedule: unknown): Schedule {
	if (schedule === null) return null;
	if (typeof schedule !== 'object') throw new MalformedRequest('schedule is not an object');
	if (!('start' in schedule) || typeof schedule.start !== 'string') {
		throw new MalformedRequest('schedule start is not a string');
	}
	if (!('due' in schedule) || typeof schedule.due !== 'string') {
		throw new MalformedRequest('schedule due is not a string');
	}
	return { start: schedule.start, due: schedule.due };
}
