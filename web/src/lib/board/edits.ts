import type { Api } from '../api';
import { placeAt } from '../tickets';
import type { ApiErrorCode, Column, Schedule, Ticket, TicketComment } from '../types';
import {
	ApiError,
	commentCharsMax,
	commentsMax,
	depthMax,
	descriptionCharsMax,
	subTicketsMax,
	textCharsMax,
	ticketsMax
} from '../types';

// An `Edit` is one change the user asked for. Components report every change
// as an `Edit` through a single `onEdit` callback; the page sends it on.
export type Edit =
	| {
			kind: 'createTicket';
			name: string;
			schedule: Schedule;
			parent: string | null;
	  }
	| { kind: 'renameTicket'; ticketId: string; name: string }
	| { kind: 'setSchedule'; ticketId: string; schedule: Schedule }
	| { kind: 'setDescription'; ticketId: string; description: string }
	| { kind: 'moveTicket'; ticketId: string; column: Column; index: number }
	| { kind: 'removeTicket'; ticketId: string }
	| { kind: 'addComment'; ticketId: string; text: string }
	| { kind: 'removeComment'; commentId: string };

// Resolves to true when the change was made, so a form knows to clear itself.
export type OnEdit = (edit: Edit) => Promise<boolean>;

// What the page holds of the board: every ticket and every comment.
export interface BoardData {
	tickets: Ticket[];
	comments: TicketComment[];
}

// The board after an edit, given the board before it.
export type BoardChange = (board: BoardData) => BoardData;

// Sends the edit and gives how the board changes, using what the `Api` returned
// (Web 4.1): a new ticket or comment goes last, a moved ticket to the place the
// edit asked for by the `Api`'s own rule, a removed one goes (a ticket with its
// comments), any other replaces its copy.
export async function send(api: Api, edit: Edit): Promise<BoardChange> {
	switch (edit.kind) {
		case 'createTicket': {
			const ticket = await api.createTicket(edit.name, edit.schedule, edit.parent);
			return (board) => ({ ...board, tickets: [...board.tickets, ticket] });
		}
		case 'renameTicket':
			return replaceWith(await api.renameTicket(edit.ticketId, edit.name));
		case 'setSchedule':
			return replaceWith(await api.setSchedule(edit.ticketId, edit.schedule));
		case 'setDescription':
			return replaceWith(await api.setDescription(edit.ticketId, edit.description));
		case 'moveTicket': {
			const ticket = await api.moveTicket(edit.ticketId, edit.column, edit.index);
			return (board) => ({
				...board,
				tickets: placeAt(board.tickets, ticket, edit.column, edit.index)
			});
		}
		case 'removeTicket':
			await api.removeTicket(edit.ticketId);
			return (board) => ({
				tickets: board.tickets.filter((ticket) => ticket.id !== edit.ticketId),
				comments: board.comments.filter((comment) => comment.ticketId !== edit.ticketId)
			});
		case 'addComment': {
			const comment = await api.addComment(edit.ticketId, edit.text);
			return (board) => ({ ...board, comments: [...board.comments, comment] });
		}
		case 'removeComment':
			await api.removeComment(edit.commentId);
			return (board) => ({
				...board,
				comments: board.comments.filter((comment) => comment.id !== edit.commentId)
			});
	}
}

function replaceWith(ticket: Ticket): BoardChange {
	return (board) => ({
		...board,
		tickets: board.tickets.map((other) => (other.id === ticket.id ? ticket : other))
	});
}

const messages: Record<ApiErrorCode, string> = {
	invalid_id: 'That ticket ID is not one the board gives.',
	not_found: 'That ticket or comment is no longer on the board.',
	blank: "A name or a comment can't be blank.",
	too_long: `That is too long: names hold up to ${textCharsMax} characters, descriptions ${descriptionCharsMax}, comments ${commentCharsMax}.`,
	bad_schedule: 'Give both dates, with the start on or before the due date.',
	bad_position: "That move didn't work.",
	has_sub_tickets: 'That ticket still has sub-tickets: remove or move them first.',
	ticket_limit: `The board is full: it holds up to ${ticketsMax} tickets.`,
	sub_ticket_limit: `A ticket holds up to ${subTicketsMax} sub-tickets.`,
	depth_limit: `Tickets nest up to ${depthMax} levels deep.`,
	comment_limit: `The board holds up to ${commentsMax} comments.`
};

// Says what to tell the user when an edit fails (Web 4.2).
export function failureMessage(error: unknown): string {
	if (error instanceof ApiError) return messages[error.code];
	return 'Something went wrong, and the change was not saved.';
}

// Users never type an ID, so `invalid_id` and `bad_position` mean the page
// itself is wrong; so does any failure that isn't a refusal.
export function isPageFault(error: unknown): boolean {
	if (!(error instanceof ApiError)) return true;
	return error.code === 'invalid_id' || error.code === 'bad_position';
}
