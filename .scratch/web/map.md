# web

Labels: wayfinder:map

## Destination

The MVP0 ticket board front end in `web/`: a SvelteKit static site with one `api.ts` as its only data door, working end to end against a fake in-browser API, as specified in [BRIEF.md](../../web/BRIEF.md). The milestone plan and its decisions are in [MILESTONES.md](../../web/MILESTONES.md).

## Notes

- **Tracker:** [local-Markdown convention](../../docs/agents/issue-tracker.md). One ticket per milestone, plus tickets for issues found along the way.
- **Working style:** see [CLAUDE.md](../../CLAUDE.md). The user approves each milestone's `## Plan` once when it is claimed; the work then runs through, with reviews per item.
- **Data:** synthetic only. Never content copied from a real tracker.

## Decisions so far

<!-- One gist and named link per resolved ticket. -->
- [M0: Contract and fake data](issues/01-m0-contract.md): `types.ts`, `api.ts` and `seed.ts` as the API contract; whole tickets move, both dates or none, drag-and-drop positions, `setTaskDone`, fixed error order with malformed requests as 400, limits in UTF-8 bytes.
- [M1: Skeleton](issues/02-m1-skeleton.md): SvelteKit 3 static site with strict TypeScript, exact pins behind a two-day release guard, Prettier, Vitest (55 tests) and `docs/WEB_STYLE.md`; M3 next, before M2.
- [M3: Board](issues/04-m3-board.md): read-only board of the seed tickets (columns, cards, dates, overdue, progress, checklists) with component tests for every case; viewable with `npm run preview`.
- [M2: Fake API](issues/03-m2-fake-api.md): the board saved in the browser through a fake `Api` that follows the whole contract; unreadable saves are reported and kept; wired in through `createContext`.
- [M4: Editing](issues/05-m4-editing.md): create, edit, tick, add, rename, remove, and drag tickets and tasks, all saved in the browser; refusals explained; repeat submits and stray drags handled.
- [M5: Design pass](issues/06-m5-design.md): text-area checklists, three-state tasks, a board per ticket, hover controls, carrying with a gap, 64-character limits, phone width.
- [M6: Sub-tickets](issues/07-m6-sub-tickets.md): tasks replaced by tickets nesting to any depth (32 levels), typed or generated `TL-` IDs (typed ones removed in M12), a Backlog stage, one board at every level with a trail back up.
- [M7: Motion](issues/08-m7-motion.md): short transitions everywhere, off under reduced motion; the dragged card sways and glides into place.
- [M8: Select several](issues/09-m8-multi-select.md): box-select, Cmd-click or Space to pick cards, move them as one by drag or Alt and an arrow; card progress as a bar.
- [M9: Description](issues/10-m9-description.md): an editable plain-text description on each ticket's own view; old boards load with empty ones; a compact new-ticket form.
- [M10: Edit in place](issues/11-m10-edit-in-place.md): a '+ New ticket' line and in-place name and date fields replace the forms.
- [M11: Comments](issues/12-m11-comments.md): comments per ticket, rolled up the hierarchy, in a sidebar on the ticket's view.
- [M12: Generated IDs only](issues/13-m12-generated-ids.md): no typed IDs; every ticket, seed included, gets a generated `TL-` ID; the new-ticket line takes all its text as the name; boards saved with `DEV-` IDs are left unread under the old key.

## Out of scope

- The Zig backend (`board`, `store`, `api`, `server`): separate modules, built after web.
- Users and done notes: a later release.
- Branding.
