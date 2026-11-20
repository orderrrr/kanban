# Issue tracker: Local Markdown

This project uses the local-Markdown fallback described by the installed `setup-matt-pocock-skills/issue-tracker-local.md`. Session task-tool entries are execution bookkeeping, not the canonical wayfinder map.

## Wayfinding operations

- **Map:** `.scratch/<effort>/map.md`, labelled with `Labels: wayfinder:map`.
- **Children:** one decision per `.scratch/<effort>/issues/NN-<slug>.md`, numbered from `01`. The filename is its local identity; the heading is its human-readable name. Placement supplies the parent relationship; `Parent:` also links the named map.
- **Type:** `Type: grilling`, `prototype`, `research` or `task`, with the matching `Labels: wayfinder:<type>`.
- **New ticket:** `Status: open`, an empty `Assignee:`, and an empty `Blocked by:` until dependencies are wired. All initial grilling/prototype tickets are HITL.
- **Blocking:** this tracker has no native dependency API. Use `Blocked by: NN, NN` near the top; every referenced child must be `resolved` before the ticket is unblocked. Create all children before wiring their dependencies. Numbers here are tracker metadata, not a substitute for names in narration.
- **Frontier:** scan the current effort's children, select `Status: open` with no assignee and all blockers resolved, then order by numeric filename prefix. Do not maintain a duplicate open-ticket list in the map.
- **Claim:** reread the ticket and blockers, confirm it is still available, then set `Assignee:` to the developer driving the map and `Status: claimed` in the same save before any work. Recheck the claim before proceeding if sessions may be concurrent; do not overwrite another claim. Local Markdown has no atomic server-side claim operation, so concurrent writers must coordinate.
- **Resolution:** append the answer under `## Answer`, set `Status: resolved`, and append one gist plus a named link to the map's Decisions-so-far. This is the local resolution-comment convention; preserve the original question.
- **Discussion:** append other comments under `## Comments`. Link assets rather than pasting their contents into a ticket.
- **Out-of-scope ticket:** set `Status: resolved`, record the scope disposition in a comment, and link it only from the map's Out-of-scope section, not Decisions-so-far.
- **Evolution:** graduate fog to new child questions, create then wire, and remove each graduated patch from the map. Never overwrite another session's changes from a stale map read.

A wayfinder session resolves at most one non-research ticket. Charting creates the map and frontier but resolves no decision tickets. HITL answers require the human's participation; review agents must not decide on the human's behalf.
