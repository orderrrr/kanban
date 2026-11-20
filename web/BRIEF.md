# web: brief

The front end of the MVP0 ticket board: a SvelteKit static site. In the [module plan](../.scratch/kanban/assets/module-plan.md) this is the `web` module; everything here was decided with the user on 03/11/2026.

## What it shows

- One board with four columns: Backlog, To do, In progress, Done. Changed on 03/11/2026 from three columns.
- Each **ticket** is one card in one column: its ID (generated, `TL-` and a number; there are no typed IDs), name, start and due dates, overdue mark and progress (a bar split by its sub-tickets' stages, "3 done, 1 in progress, 2 to do"); its sub-tickets show when it is opened. The whole ticket moves between columns.
- Tickets **nest**: a sub-ticket is a whole ticket under another, as deep as wanted, so a main ticket carries its workstreams. Opening a ticket shows its sub-tickets on the same board. This replaced tasks (checklist items) on 03/11/2026.
- No users and no done notes yet (a later release).
- The [ticket board prototype](../.scratch/kanban/prototypes/ticket-board-PROTOTYPE.html) shows the model; its look is not kept.

## How it is built

- **SvelteKit 3 with `@sveltejs/adapter-static`, Svelte 5 (runes), TypeScript, Vite 8.** Versions pinned exactly in `package.json` with a committed lockfile. Prerendered, SSR off: `npm run build` writes plain files to `build/`, which `server` serves later. No Node at runtime.
- **Small composable components**, each with one job (for example `Board`, `Column`, `TicketCard`, `TicketView`, `DateRange`).
- **One `api.ts` is the only door to data.** Its types (`types.ts`) are the API contract the Zig `api` module implements later. Until then `api.ts` keeps data in memory, saved to `localStorage` and seeded with synthetic tickets; later only its insides change to `fetch` calls, and no component changes.
- **Tests:** Vitest for `api.ts` and pure logic (dates, overdue, progress); `@testing-library/svelte` for components. Both run in Node. Browser end-to-end tests wait for the real backend.
- **Style:** [`docs/WEB_STYLE.md`](../docs/WEB_STYLE.md), written in M1.
- **Look:** neutral, no branding.

## Rules

- Synthetic data only: fictional customers and names. Never content copied from a real tracker.
- No secrets or personal data in the code, seed data or `localStorage`.
- `localStorage` is only the stand-in for the backend; nothing else depends on it.
