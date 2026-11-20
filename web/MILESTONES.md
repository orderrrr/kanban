# web: milestones

The MVP0 ticket board front end, built first with no backend; see [BRIEF.md](BRIEF.md).

## Decisions (with the user, 03/11/2026)

- **Model:** tickets move as a whole between To do, In progress and Done; scheduled by ticket start and due dates; tasks are a checklist (title, done). No users.
- **Stack:** SvelteKit 3, adapter-static, Svelte 5, TypeScript, Vite 8, latest stable versions pinned exactly.
- **Data:** one `api.ts` over `types.ts` (the API contract); in memory plus `localStorage`, seeded, until the Zig `api` exists.
- **Tests:** Vitest and `@testing-library/svelte`; no browser tests yet.
- **Review:** the milestone gate for web runs `mr-review` and a [`docs/WEB_STYLE.md`](../docs/WEB_STYLE.md) pass in separate subagents, with `npm run check` and `npm test` passing.
- **Look:** neutral, no branding.
- **Drag and drop:** tickets to any column and position; tasks reordered within their ticket. Order within a column is the user's manual order (03/11/2026).

## Open, settled in the milestone named

- None left open. Settled in M0 and changed since (see `src/lib/types.ts` and `src/lib/api.ts`): dates optional, both or neither; Done is never overdue. The limits now in force:
  - Ticket IDs: generated only, `TL-` and 1 to 8 digits, never reused (M12; before, typed `DEV-` IDs too).
  - Tickets: 1024 on the board at every level, 64 directly under one ticket, nesting 32 levels deep (M6; tasks are gone).
  - Text, counted in characters after trimming: names 32, descriptions 4000 (M9), comments 2000 (M11), and 10,000 comments on the board.

## Milestones

| # | Milestone | Done when |
|---|---|---|
| M0 | **Contract and fake data.** `types.ts` (Ticket, Task, Column), the `api.ts` function signatures, synthetic seed tickets covering every case (each column, overdue, no tasks, all done, at the limits). | Reviewed with the user. |
| M1 | **Skeleton.** SvelteKit 3 project in `web/` with adapter-static, TypeScript, pinned versions and lockfile, `npm run check`, Vitest with one test; `docs/WEB_STYLE.md`. | `npm run build` writes `build/`; `npm run check` and `npm test` pass. |
| M2 | **Fake API.** `api.ts` in memory, saved to `localStorage`, seeded on first run; limits enforced with named errors. | Every function is tested, including limits and reload. |
| M3 | **Board.** `Board`, `Column`, `TicketCard`, `Checklist`, `TaskItem`, `DateRange` showing the seed tickets: dates, overdue, progress. | Component tests cover each case in the seed data. |
| M4 | **Editing.** Create a ticket; edit name and dates; drag tickets to any column and position; add, tick, rename, remove and drag to reorder tasks. | Each action is tested and survives a reload. |
| M5 | **Design pass.** A neutral, readable look; keyboard use; works at phone width. | The user is happy with it. |
| M6 | **Sub-tickets.** Tasks go; tickets nest to any depth, each with a typed or generated ID (typed ones removed in M12); one board at every level. | Tested, gate passed, and the user is happy with it. |
| M7 | **Motion.** Short transitions for every change: lists glide, things fade and fold in and out, lift and drop, hover controls, views. Reduced motion respected. | The user is happy with it. |
| M8 | **Select several.** Draw a box on empty space, Cmd- or Ctrl-click, or Space to select cards; move them to a stage as one by drag or Alt and an arrow. | Tested, checked in a real browser, gate passed, and the user is happy with it. |
| M9 | **Description.** An editable plain-text description on each ticket's own view; boards saved before load with empty ones. | Tested, checked in a real browser, gate passed, and the user is happy with it. |
| M10 | **Edit in place.** A "+ New ticket" line and in-place name and date fields replace the forms. | Tested, checked in Chromium and Zen, gate passed, and the user is happy with it. |
| M11 | **Comments.** Comments per ticket, rolled up the hierarchy, in a sidebar on the ticket's view. | Tested, checked in Chromium and Zen, gate passed, and the user is happy with it. |
| M12 | **Generated IDs only.** No typed IDs: every ticket, the seed too, gets a `TL-` ID; boards saved with `DEV-` IDs are left unread. | Tested, checked in Chromium and Zen, and gate passed. |

Order (decided 03/11/2026): M0, M1, then **M3 before M2**, so the board can be seen sooner; M3 renders the seed tickets directly and M2 puts the fake `Api` behind them. Then M4, M5, then M6 and M7 (added 03/11/2026 at the user's request; sub-tickets before motion). M8 to M11 were added at the user's request on 03/11/2026 and 04/11/2026, and M12 on 20/11/2026, when the board moved to its own repo.

Every milestone passes the gate in [`../CLAUDE.md`](../CLAUDE.md) before it is resolved.
