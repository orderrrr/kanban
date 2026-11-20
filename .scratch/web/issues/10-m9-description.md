# M9: A ticket's description

Type: task
Labels: wayfinder:task
Mode: HITL
Status: resolved
Assignee: nmcintosh
Parent: [web](../map.md)
Blocked by: 09

## Goal

Asked for by the user on 04/11/2026: an open ticket's board holds a description that can be edited. Done when tested, checked in a real browser, through the gate, and the user is happy with it.

## Plan

- [x] 1. Contract: a ticket gains `description`, plain text, at most 4000 characters, empty allowed; `setDescription(id, text)`; the fake `Api` saves it, and a board saved before this loads with empty descriptions (no clearing site data). Tests.
- [x] 2. The ticket view shows it under the name and dates as plain text with its line breaks kept, or "Add a description" when empty.
- [x] 3. Clicking it edits it in a box that grows with the text; leaving the box or Cmd/Ctrl+Enter saves, Escape puts the saved text back.
- [x] 4. Cards stay as they are: the description shows only on the ticket's own view.
- [x] 5. Tests, a check in a real browser, and the milestone gate.

## Comments
- 04/11/2026, asked for by the user (a design change, before M9 work): the new-ticket form is compact: the ID (narrow, "DEV- or blank") beside the name, and the start and due dates on one line with "to" between; labels stay for screen readers but are not shown. 230 px tall became 99 px. 258 tests.
- 04/11/2026: plan approved by the user. Items 1 to 4 built together (reviewed in the gate). Decided without asking: the description is trimmed of ASCII whitespace at its ends like a name, but may be empty; `setDescription` refuses over 4000 characters as `too_long` (its message now names both limits); a saved board without descriptions is given empty ones on load (`withDescriptions`) rather than called unreadable, then checked as before; DEV-1234 in the seed has a two-paragraph description. `Description.svelte` shows it as a button that reads as plain text (line breaks kept) and opens a textarea that starts focused and grows with the text; leaving it or Cmd/Ctrl+Enter saves, plain Enter is a new line, Escape puts the saved text back, a refused save keeps the box open. Its text lines up with the ticket's name. 269 tests; checked in headless Chromium: an old-format board loads, the box opens focused and grows (63 to 80 px with a third line), Ctrl+Enter saves.
- 04/11/2026, gate round 1. `mr-review`, no blockers; applied: (1) the description button's name was the whole description: it is now named "Edit the description" with the text as its description (`aria-describedby`); a hidden "Description:" prefix was tried first but ran into the text without a space. (2) A refused save left the box open but unfocused, so leaving the view could drop what was typed: focus returns to it, after a tick (the box is still disabled while saving; the first try without the tick didn't refocus, which the test caught once it really moved focus away with `blur()`). (3) Tests: a refused save keeps the box open, focused, with the text; an unchanged description sends nothing; Cmd+Enter (and plain Enter stays a new line); the limit counts code points (4000 of 𝄞, two UTF-16 units each); saved descriptions not text, padded or too long make the board unreadable. (5) A comment by `descriptionCharsMax` on why `maxlength` (UTF-16 units) and the API (code points) both stay. Not applied: (4) an old board and a new one that lost a description look the same without a version field; accepted for the fake (the real store has its own schema); (6) the compact form relies on placeholders and titles; accepted for an internal tool. `WEB_STYLE.md`: the refused-save test (above); `keys` renamed `onBoxKey`; the seed passes the description to `add` instead of a second helper. 274 tests.
- 04/11/2026, gate round 2: `mr-review` passed and `WEB_STYLE.md` found nothing; both noted the new `it.each` repeats the older "not text" test, which is removed (a test deleted, no code changed, so no further round). Gate passed: two rounds, fixes in `e2aa276` and this commit. 273 tests. M9's done-when includes the user being happy with it, so the ticket waits on them to resolve.
- 04/11/2026: the user is happy with it; resolved.

- 04/11/2026, after resolving, reported by the user (in Zen, Firefox-based): the compact form's name and date boxes ran past the card's right edge, from Firefox's wider default box widths. Each row is now a grid of columns that may shrink and every box fills its cell. Checked in Zen 159 headless (driven over WebDriver BiDi): no box past the form, no sideways page scroll.

- 04/11/2026, after resolving, reported by the user: the open description box stuck out to the left of the name (a -9 px margin meant to line its text up). Both the shown text and the box now start at the name's edge; the shown text's hover outline sits just outside it (`outline-offset`) and takes no room. Checked in Zen: name, text and box all at 16 px.

## Answer

Each ticket has a plain-text description (trimmed, empty allowed, at most 4000 code points), set with `setDescription`; boards saved before it load with empty descriptions. The ticket's own view shows it under the name and dates with line breaks kept ("Add a description" when empty); clicking opens a growing box, leaving or Cmd/Ctrl+Enter saves, Escape cancels, a refused save keeps the box open and focused. Cards don't show it. The new-ticket form also became compact (ID beside name, dates on one line). 273 tests. Gate: two rounds, fixes in `e2aa276`, `d5f9f1a`.
