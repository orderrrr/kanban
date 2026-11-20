# Web Style Guide

Rules for the Svelte and TypeScript code in `web/`. The Zig guides ([`STYLE.md`](STYLE.md), [`TIGER_STYLE.md`](TIGER_STYLE.md)) don't cover it; this guide carries over the rules from them that apply, and adds what Svelte 5 needs. Rules are numbered so a review finding can cite one ("Web 3.2").

Order of goals: **correctness, then clarity, then performance.** Prettier settles layout and `npm run check` (zero errors, zero warnings) settles types; a review doesn't repeat either.

---

## 1. Structure

### 1.1 The contract lives in `src/lib`; components group by feature

`types.ts` and `api.ts` are the board's contract with the server; `seed.ts` is the synthetic data. All three sit at the top of `src/lib`. Components go in a folder named for what they do for the user (`src/lib/board/`), never by kind (`components/`, `helpers/`).

### 1.2 One component, one job

If you can't say what a component does in one sentence without "and", split it. A component file is named after the component in PascalCase (`TicketCard.svelte`); a module of functions is named in lower case for what it holds (`dates.ts`).

### 1.3 One front door to data

Only the root layout creates the `Api` and sets it in context; every other component gets it from context. No other component imports an implementation or calls `fetch`. Only the `Api` implementation touches `localStorage`.

### 1.4 Build only what is needed now

No props, options or abstractions nobody uses yet.

---

## 2. Types

### 2.1 One source of truth

The shapes in `types.ts` are declared once. Components import them; they never redeclare a ticket, or copy a limit into a literal.

### 2.2 Make invalid states unrepresentable

Use a union where exactly one of several shapes holds (as `Schedule` does), not several optional fields that must agree. In data, absent is `null` with a stated meaning, never a magic value. An optional component prop takes its default where `$props()` is destructured.

### 2.3 No escape hatches in app code

No `any`, no non-null `!`, and no `as` except `as const`. Narrow with a guard instead. Get and set the `Api` through Svelte's `createContext<Api>()`, never `getContext`, which casts without checking. Tests may use `!` where the fixture or an earlier assertion guarantees the value; a wrong guess there fails the test, which is the point.

### 2.4 Erasable TypeScript only

No `enum`, `namespace` or constructor parameter properties: Svelte and Node strip types rather than compile them (`erasableSyntaxOnly` enforces this).

---

## 3. Svelte 5

### 3.1 Runes only

`$props`, `$state`, `$derived`, `$effect`. No legacy `export let`, `$:` or stores.

### 3.2 Typed props, callback events

Declare a component's props as a TypeScript interface. A child reports a change through a callback prop named `on<Something>` (`onMove`), not an event dispatcher.

### 3.3 Derive, don't sync

A value computed from state is `$derived`. `$effect` is only for reaching outside Svelte (logging, focus, calling the `Api`), never for copying one piece of state into another.

### 3.4 State has one owner

Each piece of state lives in one component. Children receive it as props and ask for changes through callbacks. No module-level mutable state outside the `Api` implementation.

### 3.5 Snippets for composition

Pass markup into a component with snippets, not slots.

### 3.6 Clocks are passed in

Components take `today` as a prop; only the root calls the today helper (Web 4.3). A component never reads the clock, so its tests don't depend on the date.

---

## 4. Data and errors

### 4.1 The server's answer wins

After a change, replace the ticket with the one the API returned. After `moveTicket`, place the returned ticket at the index the page asked for, which is the same rule the API applies; that is the only local change allowed. Don't patch a local copy and hope it matches.

### 4.2 Classify each failure

An `ApiError` is shown to the user in plain words. Any other rejection (a lost connection, a server fault, a malformed request) is shown as "something went wrong" and logged. `invalid_id` from any call, and `bad_position`, are page bugs: show them and log them.

### 4.3 Dates are `IsoDate` strings

Compare dates as `YYYY-MM-DD` strings. "Today" comes from one helper that gives the local date. `toISOString()` is used only on a Date built at UTC midnight from an `IsoDate`, never to get today. The one other use is writing a moment from the `Api`'s clock, such as when a comment was written, which is stored as UTC and shown in local time (amended with the user on 04/11/2026).

### 4.4 Handle it or pass it on

Only the page and the root layout log (the layout because creating the `Api` can fail before any page exists); the `Api` implementation rejects and doesn't log. No empty `catch`: a catch that swallows a failure says in one line why it is harmless.

### 4.5 Guard clauses first

Reject bad input at the top and return early; keep the main path flat.

---

## 5. Accessibility

### 5.1 The element that means the thing

`<button>` for actions, a `<label>` for every input, headings in order. Checked from the first component.

### 5.2 A keyboard way to do everything

Everything you can do with a mouse, including drag and drop, has a keyboard way to do it. Checked from the design pass, where keyboard use is planned.

---

## 6. Naming and comments

### 6.1 Plain words

No abbreviations, including one-letter names; use the board's own terms (ticket, sub-ticket, column, schedule). Qualifiers go last (`textCharsMax`).

### 6.2 Comments say why

Block comments are full sentences. End-of-line comments, and labels on fixture data, may be phrases.

### 6.3 No work references in code

No references to our own work tickets or milestones in code, comments, test names or log text. Synthetic IDs in data and fixtures (`TL-1`) are fine.

---

## 7. Tests

### 7.1 Tests say what they prove

Name each test for the behaviour it proves. Cover valid input, invalid input and the boundary between them.

### 7.2 Find elements the way a user does

Component tests find elements by role, label or text, never by class name or structure.

---

## 8. Dependencies

### 8.1 Add a package only when needed

Add one only when the platform and the packages already here can't do the job.

### 8.2 Pinned and aged

Pin exact versions and commit the lockfile. `web/.npmrc` sets `min-release-age=2`, so a new release waits two days before it can be installed.
