import type { Column, Schedule, Ticket, TicketComment } from './types';

// The only way the page reads or changes board data. Every change returns the
// whole updated ticket (removal returns nothing), so a component replaces its
// copy in one step and never patches part of it. A refused request rejects
// with an `ApiError`. Anything else, such as a lost connection or a server
// fault, rejects with another error and is not the user's input.
//
// A malformed request (see `ApiErrorBody`) fails before any rule below, with
// another error, not an `ApiError`, because the request is read before the
// rules run. Otherwise, when a request breaks several rules, the first in this
// order wins, here and in the Zig server alike: `invalid_id`, `not_found`,
// `blank`, `too_long`, `bad_schedule`, `bad_position`, `has_sub_tickets`,
// `ticket_limit`, `sub_ticket_limit`, `depth_limit`, `comment_limit`. IDs are
// checked first (well formed, and existing where the call needs it); then the
// text, the schedule and the position; then the limits.
export interface Api {
	// Returns every ticket at every level, in board order: among the tickets
	// under one parent (or at the top), within each column, the order you
	// arranged them.
	listTickets(): Promise<Ticket[]>;

	// A new ticket goes to the end of Backlog under `parent` (null for the top
	// level), with no sub-tickets and no description. It gets the next `TL-`
	// ID. Numbers are never reused, even after a ticket is removed; the API
	// keeps the next one itself and never sends it. Once they run out
	// (`generatedNumberMax`), a new ticket is `ticket_limit`.
	createTicket(name: string, schedule: Schedule, parent: string | null): Promise<Ticket>;
	renameTicket(id: string, name: string): Promise<Ticket>;
	setSchedule(id: string, schedule: Schedule): Promise<Ticket>;
	// Replaces the description. An empty one (after trimming) clears it; one
	// over `descriptionCharsMax` is `too_long`.
	setDescription(id: string, description: string): Promise<Ticket>;
	// Puts the ticket at `index` in `column` among the tickets under the same
	// parent, counted as if it were already taken out of its current place: 0
	// is the top, and the column's length (without it) is the bottom. A safe
	// whole number outside that range is `bad_position`; any other index is a
	// malformed request. Sends the wanted column rather than a step, so a
	// repeated request (a double click, a retry) changes nothing.
	moveTicket(id: string, column: Column, index: number): Promise<Ticket>;
	// Removes a ticket that has no sub-tickets; one that has is
	// `has_sub_tickets`.
	removeTicket(id: string): Promise<void>;

	// Returns every comment on every ticket, oldest first.
	listComments(): Promise<TicketComment[]>;
	// Adds a comment to a ticket, stamped with the time the API received it.
	// Comments are not edited, only added and removed; removing a ticket
	// removes its comments.
	addComment(ticketId: string, text: string): Promise<TicketComment>;
	removeComment(id: string): Promise<void>;
}
