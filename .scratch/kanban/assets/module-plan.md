# Module plan

Agreed with the operator on 03/11/2026. Covers **MVP0**. One repository; every Zig module is exported on its own (`b.addModule`) with its own test step (`zig build test-<module>`) and a small example, following [`docs/STYLE.md`](../../../docs/STYLE.md) and [`docs/TIGER_STYLE.md`](../../../docs/TIGER_STYLE.md). Dependencies are vendored (`vendor/`); nothing is fetched at build time for the Zig code.

## MVP0

A kanban board of tickets, no users. A **ticket** has an ID, a name, a column (To do, In progress, Done), a start date and a due date, and a checklist of **tasks** (title, done or not). The whole ticket moves between columns; scheduling is the ticket's dates, not per task. Overdue tickets are marked. Prototype: [ticket board](../prototypes/ticket-board-PROTOTYPE.html) (the model, not the UI).

## How it is built

| Topic | Decision |
|---|---|
| Server | Zig |
| Database | Postgres |
| Interface | JSON API. The web page uses it now; an MCP server uses it later |
| Front end | SvelteKit 3 static site (Svelte 5, TypeScript) over the JSON API; see `web/BRIEF.md` |
| MCP | MCP over HTTP inside the main server, in a later workstream |
| Hosting | Local: the server and Postgres run on the developer's machine |
| Tests | `zig test` per module, plus API tests that start the server against a throwaway Postgres database; `zig build test` runs both and must pass before each commit |
| Delivery | Thin end-to-end slices (database, API, page), each usable when it lands, one MR with tests per slice, code kept in small modules |

## Modules (dependencies point downwards)

| Module | Owns | Depends on | I/O |
|---|---|---|---|
| `web` | The front end: SvelteKit 3 with `adapter-static`, Svelte 5, TypeScript, small composable components. All data goes through one `api.ts` whose types are the API contract. Until `api` exists, `api.ts` keeps data in memory, saved to localStorage and seeded with fake tickets | none at runtime (static files) | browser |
| `board` | Tickets, tasks, columns and dates, and their rules (for example start not after due) | std | none |
| `store` | Postgres tables (tickets, tasks, migrations); loads and saves board data. The only module that uses pg.zig | board, vendor/pg | database |
| `api` | JSON endpoints matching `web`'s `api.ts` contract, on `std.http.Server` | board, store | HTTP |
| `server` | Executable: config, start-up (opening the pool, migrations), wiring, serving `web`'s built files | all | process |

A later release adds users and login, and a done note (one line plus optional links or files) when a ticket moves to Done.

## Limits (placeholders, each settled in its module's M1)

| Limit | Placeholder |
|---|---|
| Tickets on the board | 256 |
| Tasks per ticket | 64 |
| Ticket ID | 32 bytes |
| Ticket name, task title | 256 bytes |
| JSON request body | 64 KiB |
| Postgres pool | 4 connections |

## Build order

1. `web` first, complete, with no backend, to find quickly what needs to change.
2. Then `board`, with `pg` vendored alongside, then `store`, `api`, `server`.

Slices for the backend: (0) skeleton: Zig server, Postgres connection and migrations, test harness running one API test; (1) add tickets; (2) move tickets between columns.

## pg

Vendor a Postgres client. Candidate [pg.zig](https://github.com/karlseguin/pg.zig); research findings in [research/pg-zig.md](../research/pg-zig.md) (03/11/2026): sound to vendor at `0ccd7d9` with buffer.zig and metrics.zig, without TLS at first; not yet built on 0.17; known gaps (no hostname check in TLS, no query timeout, no message size cap, cleartext auth allowed by default) to settle in the `pg` milestones.

## Versions (npm `latest`, checked 03/11/2026)

Svelte 5.57.3, SvelteKit 3.1.1, `@sveltejs/adapter-static` 4.0.1, Vite 8.3.5. Pinned exactly in `web/package.json` with a committed lockfile.
