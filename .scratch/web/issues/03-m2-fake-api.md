# M2: Fake API

Type: task
Labels: wayfinder:task
Mode: HITL
Status: resolved
Assignee: nmcintosh
Parent: [web](../map.md)
Blocked by: 04

## Goal

`api.ts` in memory, saved to `localStorage`, seeded on first run; limits enforced with named errors. Keeps a hidden next task number per ticket. Rejects a malformed request, as defined at `ApiErrorBody` in `types.ts`, with a non-`ApiError`, before any code. Tests cover index `-1` (`bad_position`) and a huge index such as `1e300` (malformed). Tests also cover the longest task ID (`t9999999`, after which `addTask` refuses with `task_limit`) and removing the highest task then adding one (no reuse). Done when every function is tested, including limits and reload.

## Plan

<!-- Written with the user when this ticket is claimed; approved once. -->
- [x] 1. `src/lib/fake-api.ts`: `createFakeApi(storage, today)`, an `Api` kept in memory and saved to the given storage (`localStorage` in the page), seeded on first load. Follows the M0 contract: malformed first (non-`ApiError`), then the error order; limits; trimming; hidden next task number per ticket; safe-integer indexes; every change returns the whole ticket.
- [x] 2. Tests for every function, including limits, a reload from storage, removing the highest task then adding one, `t9999999` then `task_limit`, index `-1` and `1e300`, corrupt storage.
- [x] 3. Wiring: `src/lib/api-context.ts` with `createContext<Api>()`; the root layout creates the fake and sets it; the page loads its tickets from `listTickets()`.
- [x] 4. Milestone gate: `mr-review` and a `WEB_STYLE.md` pass, until clean.

## Comments

- 03/11/2026: the user chose to carry on without changes after seeing the board; plan as presented.
- 03/11/2026, items 1 to 3 built; reviewed as part of the gate. Decided without asking: a saved board that can't be read is never replaced by the seed (the page says so and logs why, so no work is lost); each change works on a copy and is kept only once saved, so a failed save changes nothing; the root layout also provides `today` through context, since a layout can't pass props to its page; malformed-input tests use `@ts-expect-error` instead of a cast (Web 2.3); Node 26's own `localStorage` global is switched off in test workers so jsdom's is used. 98 tests pass, including the layout and page together.
- 03/11/2026, milestone gate round 1. mr-review: the schedule passed in was stored as it was, so a Svelte proxy could half-apply a change and a later change to the caller's object reached the board unchecked; now copied to the two dates (tests: proxy, later change, extra field). Malformed tests added for every function. A missing next task number makes a saved board unreadable (see the full check below). README and CHANGELOG updated. Decided without asking, as Web 2.3 requires: a saved board is checked in full (every ticket, task, schedule and next number) and anything else is `UnreadableBoard`. WEB_STYLE pass (rules approved in advance): `columns` and `taskNumberMax` declared once in `types.ts` (Web 2.1); the page's load is one union state (Web 2.2); storage failures other than an unreadable board say "something went wrong" (Web 4.2); `taskNumbersNext` and `taskNumberHighest` (Web 6.1); the last-place `moveTask` and the page's failure paths tested (Web 7.1); the layout comment says why. Rule changed to fit: Web 4.4 now lets the root layout log too, since creating the `Api` can fail before any page exists. 109 tests pass.
- 03/11/2026, milestone gate round 2. mr-review: the next-number fallback could never run, so a missing number now throws as a fault in the code; the saved-board check now also applies the text rules (trimmed, not blank, 256 bytes) and the ticket and task limits, as "checked in full" said. WEB_STYLE pass: the layout's success case is `null`, not a `'none'` string (Web 2.2); a one-letter parameter named (Web 6.1); a test name says "API error" (Web 7.1). Note: a browser holding a board saved before the `taskNumbersNext` rename shows "can't be read"; clearing the site data starts again from the seed.
- 03/11/2026, milestone gate round 3 (on a0a8955): nothing new. Gate passed.

## Answer

`createFakeApi(storage, today)` in `web/src/lib/fake-api.ts`: the board kept in `localStorage` under `ticket-board`, seeded on the first visit, every change made on a copy and kept only once saved. It follows the whole contract: malformed requests fail first with `MalformedRequest`, then the fixed error order; ASCII trimming and byte limits; a hidden next task number per ticket, never reused; safe-integer indexes; schedules copied in; every change returns a copy of the whole ticket. A saved board is checked in full and anything else is `UnreadableBoard`, reported and kept. The root layout creates the `Api` and `today` through `createContext`, reporting an unreadable board apart from other storage failures; the page loads through `listTickets` as one union state. 111 tests. Web 4.4 now lets the root layout log. Gate: three rounds; fixes in `b77a632` and `a0a8955`.
