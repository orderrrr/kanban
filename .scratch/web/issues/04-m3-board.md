# M3: Board

Type: task
Labels: wayfinder:task
Mode: HITL
Status: resolved
Assignee: nmcintosh
Parent: [web](../map.md)
Blocked by: 02

## Goal

`Board`, `Column`, `TicketCard`, `Checklist`, `TaskItem`, `DateRange` showing the seed tickets with dates, overdue and progress. Adds one helper for today's local date (never the UTC date), tested for the hour after midnight in UTC+2. Done when component tests cover each case in the seed data.

Built before M2 (decided 03/11/2026, so a board can be seen sooner): the root renders the seed tickets directly and passes them down as props; M2 then puts the fake `Api` behind them.

When the first component test brings back jsdom and Testing Library, raise `engines.node` and the README's Node line to jsdom's range (`^22.22.2 || ^24.15.0 || >=26.0.0` for jsdom 30.1.3) in the same commit.

## Plan

<!-- Written with the user when this ticket is claimed; approved once. -->
- [x] 1. `src/lib/board/dates.ts`: `localToday(now)`, the viewer's local date; tests in UTC+2 (fixed in the Vitest config) for the hour after midnight.
- [x] 2. Component testing: bring back jsdom and @testing-library/svelte, raise `engines.node` and the README to jsdom's range, a component test file opts into jsdom with `// @vitest-environment jsdom` at its top (Vitest 4 has no `environmentMatchGlobs`; this is simpler than two test projects).
- [x] 3. Components in `src/lib/board/`: `Board` (three columns), `Column` (heading, count), `TicketCard` (ID, name, dates, overdue, "n of m done", checklist), `Checklist` and `TaskItem` (read-only), `DateRange` ("03/11/2026 to 11/11/2026" or "Not scheduled").
- [x] 4. The page: today from `localToday`, the seed tickets rendered on the board.
- [x] 5. Component tests for each seed case: overdue, due today, not scheduled, no tasks, all done, the limit ticket.
- [x] 6. Plain, readable CSS (the design pass is M5).
- [x] 7. Milestone gate: `mr-review` and a `WEB_STYLE.md` pass, until clean.

## Comments

- 03/11/2026: plan approved by the user.
- 03/11/2026, items 1 to 4 and 6 (committed together, as they were built together to get a board on screen early): item 1 review, nothing new. Items 2 and 3, mr-review and WEB_STYLE pass: applied the plan text updated to what was built (per-file jsdom opt-in, DD/MM/YYYY dates), CHANGELOG entries for the board and the new Node range, comment sentences, `ColumnName` alias, and the ticket count moved out of the column heading so its accessible name is just the column ("3 tickets" below it). Kit 3 removed `$lib`; its `#lib` subpath import doesn't type-check without extensions, so the page uses relative imports. The packages added in item 2 are used by item 5's tests. The user saw the board at `npm run preview`.
- 03/11/2026, item 5: component tests for every seed case (columns and counts, seed order, DD/MM/YYYY, only DEV-1260 overdue, no schedule and no tasks, all done with read-only ticked boxes, labelled boxes, the limit ticket in full) and a `displayDate` test; 67 tests pass. Reviewed as part of the gate.
- 03/11/2026, milestone gate round 1. mr-review: README described a placeholder page; now says the board renders the seed and the fake `Api` comes next. WEB_STYLE pass (rules approved in advance): three comments made sentences (Web 6.2); the column-order test compares full accessible names instead of splitting a label (Web 7.2). 67 tests, check, lint pass.
- 03/11/2026, milestone gate round 2 (on d5366c4): nothing new. Gate passed.

## Answer

The read-only board in `web/src/lib/board/`: `Board` (three columns), `Column` (heading and ticket count), `TicketCard` (ID, name, DD/MM/YYYY dates, Overdue label, "n of m done" or "No tasks", checklist), `DateRange`, `Checklist`, `TaskItem` (read-only box), with `localToday` and `displayDate` in `dates.ts`. The page reads the clock once and renders the seed tickets; the fake `Api` goes behind it in M2. Component tests (jsdom per file) cover every seed case; 67 tests pass. Plain CSS, one column below 720 px. Kit 3 removed `$lib`, so imports are relative. Gate: two rounds; fixes in `d5366c4`.
