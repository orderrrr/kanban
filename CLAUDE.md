# kanban

A kanban board of tickets: tickets nest as sub-tickets to any depth, each with dates, a description and comments. See the [module plan](.scratch/kanban/assets/module-plan.md) for the modules and the decisions behind them.

Modules follow the module plan; each gets a `BRIEF.md` and `MILESTONES.md`, listed here as they are written. MVP0 modules: `web`, `board`, `store`, `api`, `server`.

- web: see `web/BRIEF.md` and `web/MILESTONES.md`; tracker in `.scratch/web/`.

Vendored Zig code for the later modules is in `vendor/` (see `vendor/README.md`).

## How we work

I approve the plan; you run it.

- When a milestone ticket is claimed, write its `## Plan` (small items: one function, one type or one test each) and ask me to approve it once.
- Once approved, work through every plan item without stopping. Each item gets the three reviews below in separate subagents, its findings applied, and its own commit (message like `M1.1: package skeleton`). Never push.
- Record each item's review results on the milestone ticket as you go.
- When you're confident of the answer to a question (a review finding with a clear best fix, a contract detail, wording), decide it, apply it and record it on the ticket. Stop and ask only for real decisions: scope, behaviour I would notice, genuine trade-offs, or work beyond the approved plan.
- Approval of one milestone's plan doesn't carry over to the next.
- At the milestone gate, report back with a summary of what was done, the commits and anything deferred.

## Milestone gate

A milestone (M1, M2, …) isn't resolved until it has passed this gate. Run it after the last plan item, before resolving the ticket.

1. Run three reviews of all the milestone's code, the two style passes in separate subagents:
   - the `mr-review` skill, invoked each round (not run from memory) with its full checklist;
   - a pass against `docs/STYLE.md` only;
   - a pass against `docs/TIGER_STYLE.md` only (following `STYLE.md` where it explicitly overrides Tiger Style).
2. Every finding that a rule written in `STYLE.md` or `TIGER_STYLE.md` covers is approved in advance: apply it without asking. Don't waive a written rule because it seems not to fit. If it doesn't make sense in context, treat that as a sign the code is wrong somewhere else, and refactor until the rule fits.
3. Other findings: apply the ones with a clear best fix and record them. Only real decisions (scope, behaviour I would notice, genuine trade-offs, changes to the plan) come to me, one at a time.
4. Apply the fixes in chunks, committed like any other chunk, then report what was done. Record the gate's findings and fixes on the milestone's ticket.
5. The gate's own fixes are code changes too: run all three reviews again on them, and repeat until a round finds nothing new. Only then resolve the milestone.

For `web` (Svelte and TypeScript), step 1 runs two reviews instead of three: `mr-review` and a pass against `docs/WEB_STYLE.md` only, in separate subagents, and `npm run check` and `npm test` must pass. Steps 2 to 5 apply with `WEB_STYLE.md` in place of the two Zig guides.
