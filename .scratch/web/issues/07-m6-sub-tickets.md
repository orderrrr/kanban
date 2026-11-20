# M6: Sub-tickets

Type: task
Labels: wayfinder:task
Mode: HITL
Status: resolved
Assignee: nmcintosh
Parent: [web](../map.md)
Blocked by: 06

## Goal

Tasks go; tickets nest instead. A ticket can have sub-tickets, as deep as wanted, so a main ticket (say DEV-2222) carries the workstreams tracked and handled under it. Asked for by the user on 03/11/2026. Done when it is tested, checked in a real browser, through the gate, and the user is happy with it.

## Decisions

- By the user: tasks are dropped; there are only tickets, nested to any depth.
- By the user: a ticket's ID is typed (a DEV ID, for work tracked in another tracker) or left blank and generated.
- Decided without asking: a sub-ticket is a full ticket: ID, name, stage (Backlog, To do, In progress, Done), optional dates, its own sub-tickets.
- Decided without asking: generated IDs are `TL-1`, `TL-2`, … from one count across the board, so they never clash with typed ones.
- Decided without asking: the data is flat: each ticket names its `parent` (or none), and siblings are ordered within their stage, as the Postgres tables will be. A card lists its sub-tickets in stage order, Done last, so there is no second order to keep.
- Decided without asking: removing a ticket that still has sub-tickets is refused (`has_sub_tickets`); remove or move them first.
- Decided without asking: limits: 1024 tickets in all, 64 sub-tickets per ticket, 32 levels deep. Moving a ticket to another parent is left for later.
- Decided without asking: the saved board's format changes, so a board saved before this shows "can't be read" until the site data is cleared; no conversion of old tasks.

## Plan

- [x] 1. Contract: `Ticket` gains `parent` and loses `tasks`; task types, limits and `Api` calls go; `createTicket` takes an optional ID and a parent; `removeTicket`; error `has_sub_tickets`; the new limits. Tests for the rules.
- [x] 2. Fake `Api`: the flat board, generated IDs, moves among siblings, removal refused with sub-tickets, every limit, the saved-board check. Tests.
- [x] 3. Seed: rebuilt around nesting: a main ticket with workstreams two levels deep, typed and generated IDs, one ticket per stage, overdue, unscheduled, no sub-tickets, and one at every limit.
- [x] 4. A card's sub-ticket list (replacing the checklist and task lines): each row shows the stage box (click steps it), the ID (click opens it) and the name (click to edit); trash on hover; Enter adds a sub-ticket below with a generated ID; Backspace on an emptied name removes it; collapsed to three rows with "+n more", as now; drag and Alt with Up or Down move it.
- [x] 5. One board at every level: opening a ticket (`#DEV-2222`) shows its name, dates and pencil, a trail back up (`All tickets › DEV-2222 › TL-4`), and its sub-tickets on the same four-column board as the top level, with the same cards. `TicketBoard` and the task components go.
- [x] 6. The new-ticket form takes an optional ID ("leave blank to number it") and adds at whichever level is open.
- [x] 7. README, BRIEF and CHANGELOG brought up to date; tests pass; a check in a real browser; the milestone gate.

## Comments
- 03/11/2026, items 1 to 6 built together (reviewed in the gate). Decided without asking: the board is flat, with shared queries in `tickets.ts` (`childrenOf`, `inStageOrder`, `trailTo`, bounded by the depth limit, and `placeAt`, the one move rule both the fake `Api` and the page use); `send` gives a `BoardChange` to apply, so removal needs no returned ticket; a sub-ticket line's box moves it last into the next stage; dragging or Alt with Up or Down in a card's list can cross into the neighbouring stage, since the list is in stage order; a sub-ticket's ID opens it and its trash removes it (refused while it has its own); the open ticket's view is `TicketView` (trail, name, dates, pencil) above the same `Board`; the new-ticket form trims a typed ID and sends a blank one as null; the seed is built around nesting (DEV-1234 with DEV-1235 under it, a skipped TL number, and DEV-99999999 with 64 sub-tickets and a chain 32 deep). The logic tests were rewritten by a subagent, which found a real bug: a saved board with more than 64 sub-tickets under a top-level ticket loaded; fixed in `isBoard`. 264 tests; check clean. Checked in headless Chromium: stage-ordered card lists, opening DEV-1234 then DEV-1235 with the trail, Enter adding TL-110 below in place, a box step, and removal of a ticket with sub-tickets refused with its message.
- 03/11/2026, gate round 1. `mr-review`: one blocker and six more, all applied. (1) Blocker: an open ticket's editor survived opening another ticket and saved the first one's name and dates onto it; the page now gives each open ticket a fresh view (`{#key}`), with a test that fails without it. (2) `insertSubTicket` found its new ticket by diffing the board, so two creates at once could move the wrong one: `OnEdit` now resolves to the changed ticket's ID (null when not saved), from `send`'s `Sent`, and the insert places relative to where `after` is once the ticket exists; a test runs two inserts at once. (3) The stage box was a checkbox whose label hid the stage (Backlog and To do sounded the same): it is a plain button labelled "Stage of <name>: <stage>". (4) The Unreleased CHANGELOG still listed tasks as added: rewritten to the board as it is. (5) `api.ts` says running out of generated numbers is `ticket_limit`. (6) `placeOf` and `isWhere` compare by ID. (7) A comment rewrapped. `WEB_STYLE.md`: four, all applied. Web 2.1: `TicketCard` and `SubTicketList` derive their sub-tickets from the board instead of taking both. Web 4.2: `invalid_id` on a create with a generated ID is a page fault (only the parent was sent), with a test. Web 5.1: the outline stays flat (h1, ticket h2, columns h2, cards h3); the comment no longer claims nesting. Web 6.1: `sub` renamed. 267 tests.
- 03/11/2026, gate round 2: `mr-review` passed and `WEB_STYLE.md` found nothing; both noted one nit, applied: `insertSubTicket` finds `after`'s place by ID, like `placeOf` and `isWhere`.
- 03/11/2026, gate round 3: `mr-review` passed and `WEB_STYLE.md` found nothing. Not applied: a test where `current` returns copies (the page and the test both hand back the same objects, so it would guard a case nothing produces); and placing after an `after` that moved to another parent meanwhile, since nothing can move a ticket to another parent yet (left for later by decision). Gate passed: three rounds, fixes in `2e549dd` and `e645085`. 267 tests; check clean; the rebuilt preview checked in headless Chromium. M6's done-when includes the user being happy with it, so the ticket waits on them to resolve.
- 03/11/2026: the user is happy with it; resolved.

- 03/11/2026, after resolving, reported by the user (cards overflowing at narrower windows): columns keep at least 300 px and the board scrolls sideways when they don't all fit, instead of squeezing them (or stacking them on a phone). The board is `min-width: 0` and positioned, so it, not the page, scrolls (its visually hidden text had widened the page); card and line lists let items shrink (`minmax(0, 1fr)`), so cards no longer spill out of their columns. Checked in headless Chromium at 390, 900 and 1600 px: no card spills, the page never scrolls sideways, the board does when needed.

- 03/11/2026, after resolving, asked for by the user: a card shows only its completion ("2 of 4 done"); its sub-tickets show when it is opened. The card's sub-ticket list and everything only it used (`SubTicketList`, `SubTicketItem`, `NewSubTicketLine`, `subTickets.ts`, `OnEdit` resolving to an ID) are deleted; `OnEdit` resolves to a boolean again. Decided without asking: a trash icon beside the card's hover pencil removes a ticket, since the list held the only one. 235 tests; checked in headless Chromium.

## Answer

Tasks are gone; tickets nest. The board is flat (each ticket names its `parent`), with the shared queries and the one move rule in `tickets.ts`. IDs are typed DEV IDs or generated `TL-n`, never reused. Limits: 1024 tickets, 64 under one, 32 deep; removing a ticket with sub-tickets is refused. Cards list their sub-tickets by stage (box steps the stage, ID opens, name edits in place, Enter adds below); opening a ticket shows a trail and its sub-tickets on the same four-column board, a fresh view per ticket. `OnEdit` resolves to the changed ticket's ID. 267 tests. Gate: three rounds, fixes in `2e549dd` and `e645085`. Left for later: moving a ticket to another parent.
