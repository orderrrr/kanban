# M12: Generated IDs only

Type: task
Labels: wayfinder:task
Mode: HITL
Status: resolved
Assignee: nmcintosh
Parent: [web](../map.md)
Blocked by: 12

## Goal

Asked for by the operator on 20/11/2026, when the board moved into its own repo (`kanban/`): the board has no typed IDs. Every ticket gets a generated `TL-` ID. A later module adds typed IDs and links them to outside trackers. Plan approved by the operator on 20/11/2026, with these answers:

- Keep only `TL-` IDs. Give the seed tickets `TL-` IDs.
- The "+ New ticket" line no longer reads an ID from the start of the text.
- Remove the `duplicate_id` error. Keep `invalid_id` for bad IDs from the page.
- Change the tests from `DEV-` IDs to `TL-` IDs.
- A saved board with `DEV-` IDs must not break the page: the page starts with the seed board.
- Update `BRIEF.md`, `CHANGELOG.md` and the map to say there are no typed IDs.

Done when tested, checked in Chromium and Zen, and through the gate.

Seams under test (the ones the earlier milestones use): the `Api` from `createFakeApi`, the page (`routes/*.svelte.test.ts`), the `NewTicketLine` component, and `types.ts`'s ID checks.

## Plan

- [x] 1. Contract and seed: `createTicket(name, schedule, parent)` takes no ID; `isTicketId` accepts only `TL-`; `isTypedId` and `duplicate_id` go; `invalid_id` is always a fault in the page. The "+ New ticket" line takes the whole text as the name. Every seed ticket gets a generated `TL-` ID. Tests move from `DEV-` to `TL-` IDs.
- [x] 2. Saved boards from before: the board is kept under a new `localStorage` key, so a board saved with `DEV-` IDs is left alone and the page starts with the seed. Test.
- [x] 3. Docs and comments: `BRIEF.md`, `CHANGELOG.md`, `README.md`, `MILESTONES.md`, the map, `docs/WEB_STYLE.md` (4.2 and 6.3), and code comments that name `DEV-` (the code comments were done in item 1).

## Comments

- 20/11/2026, decided without asking: items 1 and 2 of the first draft (seed, then contract) are one item. Neither passes the tests alone: a seed without `DEV-` IDs breaks every typed-ID test, and a contract without them refuses the seed.
- 20/11/2026, decided without asking: the seed gives every ticket the next generated number in the order it is built (still skipping one number), so the seed has no hand-picked IDs. The tests' old IDs are mapped to the new ones by position in the seed. The seed's "longest ID" case goes: a seed ticket at `TL-99999999` would leave no numbers to give out. `types.test.ts` still checks the longest ID.
- 20/11/2026, decided without asking: a saved board with `DEV-` IDs today loads and shows (`isTicketId` accepts `DEV-`). Once only `TL-` is accepted, it would be an unreadable board, which the page reports and keeps, never replaced. To start with the seed and still lose nothing, the board moves to a new `localStorage` key (`kanban-board`); the old `ticket-board` entry stays in the browser, unread.
- 20/11/2026, item 1 built test first: new tests for `isTicketId` refusing `DEV-` IDs and for every seed ticket having a generated ID failed (4 red), then passed. Decided without asking: `isPageFault` takes only the error now, since no edit can make `invalid_id` the user's; the `invalid_id` message no longer describes a typed ID; the new-ticket line's `maxlength` is `textCharsMax`, like every other text box. The board's selection pruning on removal (`Board.svelte`) is removed: its only job was to stop a reused typed ID from coming back selected, and generated IDs are never reused. A test written to keep it passed with the pruning taken out, so nothing else depends on it. The refusal test on the new-ticket line now uses a name that is too long, since a duplicate ID can no longer be typed.
- 20/11/2026, item 2 built test first: a page test with a `DEV-` board under `ticket-board` showed the unreadable-board alert (red), then the seed once the key is `kanban-board` (green). The old entry is checked to be unchanged.
- 20/11/2026, item 1 reviews. `mr-review`: (1) blocker: the commit held about 80 generated files (`web/src/lib/.svelte-kit/`, `web/src/lib/node_modules/`) from a Vitest run started in `web/src/lib`; removed and folded into the M12.1 commit (not pushed), and `.gitignore` now ignores `node_modules/` and `.svelte-kit/` at any depth. (2) nit: `?? 0` in `generatedNumberHighest` cannot run now; left, since `generatedNumber` stays a parser that gives null for a non-ID. WEB_STYLE: (1) the same generated files (Web 1.1); fixed as above. (2) Web 1.4: `ticketIdCharsMax` is used only by its own test; removed with the test (`isTicketId`'s tests still check the longest ID and one digit more). Noted: `docs/WEB_STYLE.md` 4.2 and 6.3 still describe typed IDs; fixed in item 3.
- 20/11/2026, item 2 reviews. `mr-review`: pass; (1) README still names `ticket-board` (item 3 fixes it); (2) nit: "nothing is lost" overstates it, since only DevTools can reach the old entry; the comment now says "left there unread and never overwritten". WEB_STYLE: Web 6.1, the test's `old` is a bare adjective; renamed `boardBefore`.
- 20/11/2026, item 3 (docs only) is reviewed in the gate, not on its own.
- 20/11/2026, gate round 1. WEB_STYLE: no findings. `mr-review`: pass, with (1) the M6 row in `MILESTONES.md` still said "typed or generated ID"; now notes M12 removed typed ones. (2) nit: two comments wrapped short after edits (`types.ts`, `seed.ts`); reflowed. (3) nit: the old-board page test said "before generated IDs", but generated IDs are older; now "a board with typed IDs". (4) `?? 0` in `generatedNumberHighest`: already recorded, kept. Deferred, broken before M12: the `MILESTONES.md` table stops at M7, and its line 17 still describes the M0 limits.
- 20/11/2026, gate round 2 (on the round 1 fixes): `mr-review` pass, no new findings; WEB_STYLE no findings. `npm run check`: 0 errors, 0 warnings; `npm test`: 311 passed. Gate passed.
- 20/11/2026, browser checks on the built site (`vite preview`, port 4173). Chromium (CDP) and a separate headless Zen with its own profile (WebDriver BiDi; the operator's own Zen was not touched): the board loads with no `DEV-` IDs; with a `DEV-` board saved under `ticket-board`, the page starts with the seed, shows no alert and leaves the old entry unchanged; "DEV-2000 Browser check" typed on the new-ticket line becomes TL-119 with that text as its name, and it is still there after a reload (Zen).
- 20/11/2026, the two deferred doc issues fixed: `MILESTONES.md` has rows for M8 to M12 and the order note covers them, and its "Open" line lists the limits now in force (generated IDs, 1024 tickets, 64 under one, 32 levels, names 32, descriptions 4000, comments 2000, 10,000 comments) instead of the M0 ones. The CHANGELOG heading names the kanban board's front end, not "web".
- 20/11/2026: the operator signed off M12; resolved.

## Answer

The board has no typed IDs. Every ticket, the seed tickets too, gets a generated `TL-` ID that is never reused. `createTicket(name, schedule, parent)` takes no ID; `isTypedId`, `duplicate_id` and `ticketIdCharsMax` are gone, and `invalid_id` is always a fault in the page. The "+ New ticket" line takes all of its text as the name. The board is kept under the `kanban-board` key; a board saved before (under `ticket-board`, with `DEV-` IDs) is left there unread, and the page starts with the seed. BRIEF, CHANGELOG, README, MILESTONES, the map and `WEB_STYLE.md` say so.
