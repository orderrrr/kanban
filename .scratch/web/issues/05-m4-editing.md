# M4: Editing

Type: task
Labels: wayfinder:task
Mode: HITL
Status: resolved
Assignee: nmcintosh
Parent: [web](../map.md)
Blocked by: 03

## Goal

Create a ticket; edit name and dates; move between columns; add, tick, rename and remove tasks. Done when each action is tested and survives a reload.

## Plan

<!-- Written with the user when this ticket is claimed; approved once. -->
- [x] 1. The page owns the tickets: every change goes through the `Api` and replaces the ticket it returns (Web 4.1); refusals show as a plain message per code, other failures as "something went wrong" and logged (Web 4.2).
- [x] 2. New ticket: a form at the top of To do (ID, name, optional start and due dates).
- [x] 3. Edit a ticket's name and dates on its card, including clearing the dates.
- [x] 4. Checklist: tick and untick (`setTaskDone`), add, rename and remove tasks.
- [x] 5. Drag and drop with the browser's own drag events: tickets to any column and position (`moveTicket`), tasks within their checklist (`moveTask`). The keyboard way is the design pass's (Web 5.2).
- [x] 6. Tests for each action, including that it is still there after a reload.
- [x] 7. Milestone gate: `mr-review` and a `WEB_STYLE.md` pass, until clean.

## Comments

- 03/11/2026: plan approved by the user; starts when M2's gate is clean.
- 03/11/2026, items 1 to 6 built together (reviewed in the gate). Decided without asking: every change reaches the page as one `Edit` (a union, one case per `Api` change) through a single `onEdit` callback, so components don't each carry nine callbacks (Web 3.2, 2.2); `onEdit` resolves to whether the change was saved, so forms clear only on success and a refused tick snaps back; the editor sends only what changed, name first; half-filled dates are sent as they are, so the `Api` refuses them as `bad_schedule` and the message asks for both dates; drops land just before the item dropped on, or last when dropped on empty space; a task dropped on another ticket's checklist is ignored. 135 tests pass, including create, edit, clear dates, tick, add, rename, remove and both drags, each checked after a reload.
- 03/11/2026, milestone gate round 1. mr-review: a task or text dragged from inside a card also carried the ticket, so the ticket could move (now only a drag starting on the card or task row carries it, and the task row stops it reaching the card); dropping on itself moved an item to the end (now it stays); a quick double submit could add a task twice (forms ignore submits while saving and disable their button); every card's Edit and add-task controls now name their ticket. Tests added for each, and each fails without its fix (checked). WEB_STYLE pass (rules approved in advance): drag tests fire on elements found by role and read titles from button names (Web 7.2); inputs wrapped in `<label>`s (Web 5.1); message limits taken from `textBytesMax` and `ticketsMax` (Web 2.1); a half-filled date pair is caught by the form ("Give both dates, or neither.") instead of being sent as a deliberately invalid schedule (Web 2.2; `readSchedule` gives null for it); the ticket editor is its own component, `TicketEditor` (Web 1.2); comments made sentences (Web 6.2). Deferred: two edits to one ticket in flight against a real server keep whichever reply arrives last; a concern for the real `api`, not the fake. 142 tests pass.
- 03/11/2026, milestone gate round 2. mr-review: no regressions (saving flags always clear, the editor's starting values can't go stale in a way a user sees, the drag target check doesn't block real drags); added double-submit tests for the ticket editor and the task rename, each failing without its guard (checked). WEB_STYLE pass: task rows found by role, not structure (Web 7.2); tests for the editor's half-dates message and the new-ticket form's double submit (Web 7.1); two comments made sentences (Web 6.2). 146 tests pass.
- 03/11/2026, milestone gate round 3 (on 2cbd5d2): nothing new. Gate passed.

## Answer

The board is editable. Every change reaches the page as one `Edit` through `onEdit`; the page sends it to the `Api`, keeps the returned ticket (a moved one placed by the `Api`'s own rule) and explains refusals in plain words, logging page faults. New-ticket form at the top of To do; `TicketEditor` for name and dates (both or neither, caught in the form); checklist tick, add, rename and remove, with a refused tick snapping back; browser drag and drop for tickets (any column and position) and tasks (within their checklist), carrying only what was grabbed, a drop on itself changing nothing; forms ignore repeat submits. 146 tests, each action checked after a reload. Gate: three rounds; fixes in `207015b` and `2cbd5d2`. Deferred to the real `api`: two edits to one ticket in flight keep whichever reply arrives last.
