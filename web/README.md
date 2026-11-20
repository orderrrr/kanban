# web

The front end of the MVP0 ticket board: a SvelteKit 3 static site (Svelte 5, TypeScript) that
shows tickets in Backlog, To do, In progress and Done, each with its dates and its sub-tickets
(tickets nest to any depth), all editable, with drag and drop. What it is and why: [`BRIEF.md`](BRIEF.md). The plan:
[`MILESTONES.md`](MILESTONES.md). Style: [`../docs/WEB_STYLE.md`](../docs/WEB_STYLE.md).

```
npm ci             # exact versions from package-lock.json; also runs svelte-kit sync
npm run dev        # development server
npm run build      # prerendered site in build/, which the Zig server will serve
npm run preview    # serve build/ locally
npm run check      # type check, zero errors and zero warnings
npm test           # Vitest
npm run lint       # Prettier format check (there is no ESLint)
npm run format     # rewrite the code in Prettier's style
```

All board data goes through one `Api` (`src/lib/api.ts`), whose types (`src/lib/types.ts`) are
the contract the Zig `api` module implements. Until that exists, the page uses a fake `Api`
(`src/lib/fake-api.ts`) that keeps the board in this browser's `localStorage` under
`kanban-board`, seeded with the synthetic tickets in `src/lib/seed.ts` on the first visit. To start
again from the seed, clear the site's data in the browser.

Versions are pinned exactly, and `.npmrc` refuses packages published in the last two days
(`min-release-age=2`), so a new release waits before it can be pinned. Node 22.22.2, 24.15 or 26 and later (what jsdom
needs), with npm 11.20 or later (older npm ignores `min-release-age`).
