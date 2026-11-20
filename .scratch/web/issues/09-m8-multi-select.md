# M8: Select several and move them as one

Type: task
Labels: wayfinder:task
Mode: HITL
Status: resolved
Assignee: nmcintosh
Parent: [web](../map.md)
Blocked by: 08

## Goal

Asked for by the user on 03/11/2026: drag in empty space to select several tickets, and move them to a stage as one. Done when tested, checked in a real browser, through the gate, and the user is happy with it.

## Plan

- [x] 1. Box select: pressing on empty board space and dragging draws a selection box; every card it touches is selected (outlined), across columns. Shift while dragging adds to the selection.
- [x] 2. Clearing: a click on empty space, Escape, or opening a ticket clears the selection.
- [x] 3. One by one: Cmd- or Ctrl-click a card to add or remove it; Space on a card's ID does the same from the keyboard.
- [x] 4. Moving as one: dragging any selected card carries all of them, shown as the grabbed card with a count badge, with one gap; on drop they all go to that column at that place, in their board order (one `moveTicket` each, stopping at the first refusal), with the M7 sway and glide.
- [x] 5. Keyboard: Alt with Left or Right on a selected card's ID moves all selected cards to that stage; Alt with Up or Down still moves only that card.
- [x] 6. Tests, a check in a real browser, and the milestone gate.

## Comments
- 04/11/2026: plan approved by the user. Items 1 to 5 built together (reviewed in the gate). Decided without asking: `select.ts` follows a press on empty space like a lift (5 px before it is a box; mouse and pen only); the board ignores presses on cards and controls (buttons, fields, the new-ticket form); the selection is IDs in `Board`, so opening a ticket (a new view) clears it; a selected card is outlined in blue and its ID button is `aria-pressed`; Cmd- or Ctrl-click is caught on the card's row before the card's own buttons; carrying keeps the group in board order and shows one gap (the grabbed card's height) and a count badge; a drop or Alt with Left or Right moves each card in turn to land just before the card shown after the gap (or last), worked out on the board after each move, so they end up together and in order (`moveAll`); the landing glide and the no-flash landing cover the whole group. 245 tests; checked in headless Chromium: a box over two To do cards selects them, dragging one carries both into Done in order, a click on empty space clears.
- 04/11/2026, gate round 1. `mr-review`, no blockers; applied: (1) a group from several columns followed the board's hidden array order; groups and box selections now go in seen order, column by column, top to bottom (`inStageOrder`). (2) The ID button's `aria-pressed` promised a toggle only Space performed: dropped; a selected card's name ends ", selected" instead (no visible change, so decided without asking). (3) A removed ticket's ID stayed selected and came back on a new ticket with that ID: card edits pass through the board, which drops a removed ticket from the selection. (4) Tests for a group from two columns dropped mid-column, a group partly in place, a refusal midway (nothing moves), Escape during a carry (selection kept), Cmd-click on the trash icon (selects, doesn't remove), a Shift-click on empty space (kept), Escape during a box (selection put back). (5) After a partial refusal only cards really placed skip their fade (`moveAll` gives their IDs). (6) A press on the board's own scrollbar doesn't select or clear. (7) Escape gives up on a box (`pressToSelect` follows Escape) and Escape in a field no longer clears the selection. (8) Cmd-click inside the open editor is the editor's. Not applied: (9) Alt with Left or Right sends a mixed-column selection to the focused card's next stage, and the keyboard places a group only at the end; both as planned. Deferred, older than M8: a press released outside the window leaves the listeners running. `WEB_STYLE.md`: `select.test.ts` covers `overlaps` (overlap, touching edge, apart) and `pressToSelect` (4 px click, 5 px box either way, Escape, touch); the refusal-midway test above; tests press the column region, not its section; `first`/`second` and `start`/`end` names; `SelectHandlers` and `boxBetween` no longer exported. 258 tests.
- 04/11/2026, asked for by the user (a design change): a card's "2 of 4 done" is a thin progress bar (`role="progressbar"`, named and titled "2 of 4 done", so hovering shows it); its width eases with the motion timing. Checked in headless Chromium: 0%, 50% and 100% bars on the seed cards. 258 tests.
- 04/11/2026, gate round 2: `mr-review` passed with one fix: an empty progress bar was nearly invisible on the white card (track about 1.25:1); the track is now an outline in #8c959f (3:1), checked in headless Chromium at 0%, 50% and 100%. CHANGELOG lines rewrapped. `WEB_STYLE.md`: the removed-ID test now checks the new card isn't selected (its exact-name lookup already caught it); the hand-drawn bar says why it isn't `<progress>` (its fill can't reliably ease); three comments made full sentences. 258 tests.
- 04/11/2026, gate round 3: `WEB_STYLE.md` found nothing; both reviews caught the CHANGELOG rewrap gluing `### Changed` onto the Motion bullet, fixed in `1153e4d` (documentation only). Gate passed: three rounds, fixes in `acd2c37`, `cf8c9fa` and `1153e4d`. 258 tests. M8's done-when includes the user being happy with it, so the ticket waits on them to resolve.
- 04/11/2026: the user is happy with it; resolved.

## Answer

A box drawn on empty space (mouse or pen) selects every card it touches, Shift adding; Cmd- or Ctrl-click or Space on a card's ID adds or removes one; Escape or a click on empty space clears, and removed tickets leave the selection. Dragging a selected card carries the group (count badge, one gap); it lands together in seen order before the card after the gap, one move each, stopping at the first refusal. Alt with Left or Right moves the group a stage. A selected card is outlined and named ", selected". Card progress became a bar with "n of m done" on hover. 258 tests. Gate: three rounds, fixes in `acd2c37`, `cf8c9fa`, `1153e4d`. Deferred: a press released outside the window leaves its listeners running (older than M8).
