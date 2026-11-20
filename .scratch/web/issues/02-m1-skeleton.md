# M1: Skeleton

Type: task
Labels: wayfinder:task
Mode: HITL
Status: resolved
Assignee: nmcintosh
Parent: [web](../map.md)
Blocked by: 01

## Goal

SvelteKit 3 project in `web/` with adapter-static, TypeScript, exact version pins and lockfile, `npm run check`, Vitest with one test, and `docs/WEB_STYLE.md`. Done when `npm run build` writes `build/` and `npm run check` and `npm test` pass.

## Plan

<!-- Written with the user when this ticket is claimed; approved once. -->
- [x] 1. SvelteKit project in `web/`: exact pins and lockfile (Svelte 5.57.3, Kit 3.1.1, adapter-static 4.0.1, vite-plugin-svelte 7.3.1, Vite 8.3.5, TypeScript 6.0.3, svelte-check 4.7.7, Vitest 4.1.12, @testing-library/svelte 5.4.2, @testing-library/jest-dom 7.0.1, jsdom 30.1.3, Prettier 3.9.10, prettier-plugin-svelte 4.1.1), strict tsconfig, static prerender with SSR off, placeholder page, `dev`, `build`, `check`, `test`, `format`, `lint` scripts; ignore `node_modules`, `build`, `.svelte-kit`.
- [x] 2. Prettier config; format the M0 files once (formatting only).
- [x] 3. Vitest config; first tests: the rules in `types.ts` and the seed data.
- [x] 4. `docs/WEB_STYLE.md`.
- [x] 5. `web/README.md` and `web/CHANGELOG.md` (0.0.0).
- [x] 6. Milestone gate: `mr-review` and a `WEB_STYLE.md` pass (M0's files included), until clean.

## Comments

- 03/11/2026: plan approved by the user. TypeScript pinned at 6.0.3, not 7.0.2 (released today), because SvelteKit 3.1.1 and svelte-check 4.7.8 accept only `^6` (`^5 || ^6` for svelte-check).
- 03/11/2026, item 1: the user's npm config has `min-release-age = 2`, so svelte-check 4.7.8 and Vitest 5.1.0 (published in the last two days) can't be installed; pinned the newest older versions, svelte-check 4.7.7 and Vitest 4.1.12, keeping the plan's intent (latest stable the user's guard allows). Kit 3 takes its config in `vite.config.ts` through `sveltekit()` (no `svelte.config.js`) and its tsconfig extends `$app/tsconfig`; a `prepare` script runs `svelte-kit sync` after install.
- 03/11/2026, item 1 review (mr-review): applied the version record above; removed five tsconfig options the generated base already sets; kept the "static site" reason only in `+layout.ts`. Noted for item 5: README says `lint` is a Prettier format check. `npm run build` writes `build/`; `npm run check` 0 errors, 0 warnings.
- 03/11/2026, item 2 review (mr-review): pass. Markdown is left out of Prettier (hand-written docs, as in meter; Prettier re-pads tables), with the reason in `.prettierignore`; dropped the redundant `node_modules/` line. The M0 files were already compliant; only `tsconfig.json` was reformatted.
- 03/11/2026, item 3 review (mr-review): applied the ID byte limits tied to their patterns, bad dates tested as due as well as start, the seed's overdue and due-today cases checked on every test day, the limit ticket's ID length and one-day schedule asserted, task titles checked trimmed and non-blank, `it.each` so a failure names its input, and small naming gaps. Decided without asking (clear best fix): year 0000 stays a valid date and a test pins it, so the Zig side matches. Checked that removing the due-date check or widening the ID pattern now fails tests. 55 tests pass.
- 03/11/2026, item 4 review (mr-review): applied all clear fixes: `localStorage` only in the `Api` implementation; only the root layout creates the `Api`; `createContext` instead of `getContext`, and no `as` but `as const`; optional props default in `$props()`; `today` passed in as a prop; phrases allowed in end-of-line comments and fixture labels; synthetic IDs allowed; `toISOString()` only on UTC-midnight dates; handle-or-pass-on, no empty catch, guard clauses, build only what is needed; every rule numbered. Decided without asking: after `moveTicket` the page places the returned ticket at the index it asked for (the API's own rule), and the keyboard drag-and-drop rule is checked from the design pass (M5), where keyboard use is planned.
- 03/11/2026, item 5 review (mr-review): applied: README says what exists now (a placeholder page; the fake comes later), `npm ci`, `npm run preview`; `min-release-age=2` moved into `web/.npmrc` so the guard is the project's, not just the developer's; `engines` set to Node 22.17 or later so `engine-strict` means something.
- 03/11/2026: the user asked how soon a board can be seen and chose to build M3 (the board, rendering the seed tickets) straight after M1, with M2 (the fake API) after it.
- 03/11/2026, milestone gate round 1. WEB_STYLE pass, applied (rules approved in advance): removed jsdom and Testing Library until the first component test needs them (Web 8.1, 1.4); `engines.npm >=11.20` so older npm can't ignore `min-release-age` (Web 8.2); no milestone name in a comment (Web 6.3); seed limit text derived from `textBytesMax` (Web 2.1); own-line comments made sentences (Web 6.2); tsconfig include trimmed to `src` and `*` (Kit accepts it); preload attribute dropped. mr-review: the `engines.node` floor was below jsdom's needs, resolved by removing jsdom (M3 ticket now says to raise it when jsdom returns); the web gate's two-pass rule is already in CLAUDE.md under the gate; CHANGELOG keeps `Unreleased` at 0.0.0, as meter's packages do. 55 tests, check, lint and build pass.
- 03/11/2026, milestone gate round 2 (both passes on bf44aa3): lockfile regenerated so its `engines` matches `package.json`; README names npm 11.20 or later beside Node. Round 3 checks only these two lines.
- 03/11/2026, milestone gate round 3 (on 635c8f9): nothing new. Gate passed.

## Answer

The SvelteKit 3 project in `web/`: static adapter with SSR off (config in `vite.config.ts`, as Kit 3 requires), strict TypeScript extending `$app/tsconfig`, exact pins and a lockfile (svelte-check 4.7.7 and Vitest 4.1.12 because of the two-day release guard, now in `web/.npmrc`; TypeScript 6.0.3 for Kit), engines Node 22.17 and npm 11.20 or later, Prettier for code only, Vitest with 55 tests of the contract's rules and seed data, `docs/WEB_STYLE.md` (numbered rules, now the web gate's style pass), README and CHANGELOG. `npm run build`, `check`, `test` and `lint` all pass. Gate: three rounds; fixes in `bf44aa3` and `635c8f9`.
