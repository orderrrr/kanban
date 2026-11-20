// The board's data and its rules. These types are the API contract: the Zig
// `api` module returns exactly these shapes, and checks the same limits.

// The columns in board order: a ticket's stage. A ticket sits in one.
export const columns = ['backlog', 'todo', 'in_progress', 'done'] as const;
export type Column = (typeof columns)[number];

// What each column (each stage) is called on screen.
export const columnTitles: Record<Column, string> = {
	backlog: 'Backlog',
	todo: 'To do',
	in_progress: 'In progress',
	done: 'Done'
};

// A calendar date as `YYYY-MM-DD`. Strings in this form sort in date order, so
// dates compare with `<` without parsing.
export type IsoDate = string;

// A ticket is either scheduled with both dates or not scheduled at all, so it
// can never hold a start without a due date.
export type Schedule = { start: IsoDate; due: IsoDate } | null;

// Tickets nest: a sub-ticket names the ticket it sits under as its `parent`; a
// top-level ticket has none. Sub-tickets are whole tickets, with their own
// stage, dates and sub-tickets. The board is flat: every ticket at every level
// is one entry, so a move or a rename touches one ticket.
export interface Ticket {
	id: string;
	name: string;
	column: Column;
	schedule: Schedule;
	parent: string | null;
	// Plain text, line breaks kept; empty when there is none.
	description: string;
}

// A comment on a ticket: plain text, line breaks kept, and when it was
// written, as UTC in the form `Date.toISOString` gives. Its ID is "C-" and a
// number from one count across the board, never reused.
export interface TicketComment {
	id: string;
	ticketId: string;
	text: string;
	at: string;
}

// Lengths are counted in characters (Unicode code points, so "é" is one), which
// the Zig server counts the same way.
export const ticketsMax = 1024; // on the whole board, at every level
export const subTicketsMax = 64; // directly under one ticket
// How deep tickets nest: a top-level ticket is at depth 1, its sub-tickets at 2.
export const depthMax = 32;
export const generatedNumberMax = 99_999_999; // the largest number in a `TL-` ID
// Ticket names: the API trims ASCII space, tab, carriage return and line feed
// from both ends (never other Unicode spaces, so Zig trims exactly the same),
// refuses blank text, then counts the trimmed text, which is what it stores.
export const textCharsMax = 32;
// A description is trimmed the same way but may be empty. Text boxes stop at
// these limits too, but `maxlength` counts UTF-16 units, so a box is never
// looser than the API, only sometimes stricter (with emoji); keep both.
export const descriptionCharsMax = 4000;
// A comment is trimmed the same way and may not be blank.
export const commentCharsMax = 2000;
export const commentsMax = 10_000; // on the whole board

export type ApiErrorCode =
	| 'invalid_id'
	| 'blank'
	| 'too_long'
	| 'bad_schedule'
	| 'bad_position'
	| 'has_sub_tickets'
	| 'ticket_limit'
	| 'sub_ticket_limit'
	| 'depth_limit'
	| 'comment_limit'
	| 'not_found';

// What the server sends for a refused request: 404 for `not_found`, 409 for
// `has_sub_tickets`, 422 for every other code. `api.ts` turns it into an
// `ApiError`.
//
// A malformed request is a fault in the client, not the user's input: an
// unknown column, a missing field, a wrong type, or an index that isn't a safe
// whole number (`Number.isSafeInteger`; the Zig server range-checks to match,
// since an `i64` parse alone would accept more). The server answers 400 with
// no body, and the page treats it like a server fault. `api.ts` gives where
// this comes in the error order.
export interface ApiErrorBody {
	code: ApiErrorCode;
}

// A request the board refuses. The page shows it to the user and carries on.
// Users never type an ID, so `invalid_id` and `bad_position` mean the page
// itself is wrong; the page also logs those.
export class ApiError extends Error {
	readonly code: ApiErrorCode;

	constructor(code: ApiErrorCode) {
		super(code);
		this.name = 'ApiError';
		this.code = code;
	}
}

// A ticket ID is generated: "TL-" and a number, without a leading zero, from
// one count across the board.
const generatedIdPattern = /^TL-[1-9][0-9]{0,7}$/;

export function isTicketId(id: string): boolean {
	return generatedIdPattern.test(id);
}

const commentIdPattern = /^C-[1-9][0-9]{0,7}$/;

export function isCommentId(id: string): boolean {
	return commentIdPattern.test(id);
}

// The number in a comment's ID.
export function commentNumber(id: string): number {
	return Number(id.slice(2));
}

// The number in a ticket ID, or null when `id` is not one.
export function generatedNumber(id: string): number | null {
	return generatedIdPattern.test(id) ? Number(id.slice(3)) : null;
}

export function isSchedule(schedule: Schedule): boolean {
	if (schedule === null) return true;
	return isIsoDate(schedule.start) && isIsoDate(schedule.due) && schedule.start <= schedule.due;
}

// A ticket in Done is never overdue: the board doesn't record when it finished.
// `today` is the viewer's local calendar date as `YYYY-MM-DD`: never a
// timestamp (which sorts after the bare date) and never the UTC date (a day
// behind in UTC+2 between midnight and 02:00).
export function isOverdue(ticket: Ticket, today: IsoDate): boolean {
	if (ticket.column === 'done') return false;
	if (ticket.schedule === null) return false;
	return ticket.schedule.due < today;
}

export function charCount(text: string): number {
	return [...text].length;
}

function isIsoDate(date: string): boolean {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
	// Round-tripping through Date rejects dates such as 2026-02-30; a month
	// such as 13 gives an invalid Date, which `toISOString` would throw on.
	const parsed = new Date(`${date}T00:00:00Z`);
	if (Number.isNaN(parsed.getTime())) return false;
	return parsed.toISOString().startsWith(date);
}
