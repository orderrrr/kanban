# Changelog

All notable changes to the kanban board's front end (`web`). Versions follow [Semantic Versioning](https://semver.org/).

## Unreleased

### Added

- The board contract: `types.ts` (tickets that nest as sub-tickets under a parent, four stages,
  schedules, limits in characters, generated IDs, schedule and overdue rules, error
  codes and the server's error body), `tickets.ts` (the queries and the one move rule the API and
  the page share), `api.ts` (the async `Api` every component uses, including drag-and-drop
  positions), and the synthetic seed data in `seed.ts`, one ticket per case the board must show.
- The SvelteKit 3 project: static adapter with SSR off, strict TypeScript, Prettier, and Vitest
  tests for the contract's rules and the seed data. Style rules in `docs/WEB_STYLE.md`.
- The fake `Api`: the board kept in the browser's `localStorage`, seeded on the first visit, and
  following every rule of the contract. A saved board that can't be read is reported and kept,
  never replaced.
- The board: Backlog, To do, In progress and Done columns reaching the bottom of the window, each
  headed by its stage's box, its name and a count. Cards show the ID, name, dates as DD/MM/YYYY,
  an Overdue label (and a red border; no other card has one) and a progress bar of its sub-tickets
  split by stage ("2 done, 1 in progress, 1 to do" on hover); dates and progress show only when
  there are any.
- Tickets nest: a sub-ticket is a whole ticket under a parent, up to 32 levels deep and 64 under
  one ticket. Every ticket gets a generated `TL-` ID that is never reused; there are no typed
  IDs. New tickets start in Backlog, at whichever level is open.
- Editing in place: a "+ New ticket" line ends Backlog (type a name, then
  Enter); the pencil turns a ticket's name and dates into fields where they sit (Enter or leaving
  saves, Escape undoes; the pencil shows on hover). Drag tickets to any column and position, or
  move them with Alt and the arrow keys. A ticket with sub-tickets can't be removed until they are
  gone. A refusal is explained in plain words; anything else says something went wrong.
- A card shows how many of its sub-tickets are in each stage ("2 done, 1 to do"); opening it
  shows them.
  A pencil and a trash icon show at the card's top right on hover.
- A ticket has a description, plain text up to 4000 characters, shown and edited on its own view.
- Comments: each ticket's view opens its comments in a sidebar, with the box at the bottom, full
  width. Cmd or Ctrl and Enter adds one; the list shows the comments of the ticket and every ticket
  below it, oldest first, tagged with the ticket they were written on, and scrolls to the newest
  when it opens and after an add; a trash icon on hover deletes one.
- Editing in place moves nothing: the name, dates and description fields take the place, size and
  font of the text they replace, outlined dashed while open and solid where you are typing.
- Opening a ticket (from its name) shows it with a trail back up and its
  sub-tickets on the same four-column board; the address holds the open ticket, so the browser's
  back button returns.
- Names are at most 32 characters; every text field stops at its limit.
- On touch screens the pencil, trash icon and grip always show. Dragging needs a mouse.
- Several tickets can be moved as one: draw a box on empty space to select the cards it touches
  (Shift adds), or Cmd- or Ctrl-click a card, or press Space on its ID; Escape or a click on empty
  space clears. Dragging any selected card carries them all; Alt with Left or Right moves them all
  a stage.
- Columns keep a readable width; when they don't all fit, the board scrolls sideways.
- Motion: cards glide to their new place and fade in and out, the drop gap fades in and out, a
  carried card lifts, sways as it moves and glides into place when dropped, hover controls fade,
  and each view slides in; all short (120 to 200 ms) and off when the system asks for reduced
  motion.

### Changed

- Each column heading's stage box has its stage's colour: grey for Backlog, yellow for To
  do, orange for In progress, green for Done. Columns and cards keep their colours.
- A card's progress bar has one part per stage, sized by how many of its sub-tickets are in it:
  Done, In progress, To do and Backlog from the left, in the same colours as the column headings'
  boxes, and stages with none left out. Hovering lists the counts.
- Text boxes have square corners: the description, the comment box, the "+ New ticket" line and
  the in-place name and date fields. The description box's left edge lines up with the name
  above it, and its text sits inside by the box's padding, the same while reading and editing.
  The description shows a dashed outline on hover and on keyboard focus.
- On a ticket's own view, the name and dates fields are boxes like the description: their outline
  sits on their own edge, lined up with the description's, and their text sits 8px inside, the
  same while reading and editing. Cards keep their fields as before.
- No typed IDs: every ticket, the seed tickets too, gets a generated `TL-` ID, and the "+ New
  ticket" line takes all of its text as the name. The board is kept under the `kanban-board` key;
  a board saved before (under `ticket-board`) is left there unread, so the page starts with the
  seed.
- Node 22.22.2, 24.15 or 26 and later, which jsdom needs for component tests.
