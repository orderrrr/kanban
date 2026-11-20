<script lang="ts">
	import { untrack } from 'svelte';
	import type { Ticket } from '../types';
	import { textCharsMax } from '../types';
	import { readSchedule } from './dates';
	import type { OnEdit } from './edits';

	interface Props {
		ticket: Ticket;
		onEdit: OnEdit;
		onClose: () => void;
		// The name field takes the size of the heading it stands in for: a
		// card's, or the open ticket's larger one.
		size: 'card' | 'view';
	}

	let { ticket, onEdit, onClose, size }: Props = $props();

	// The fields start from the ticket as it was when the editor opened, and
	// then belong to the user until they save or undo.
	const opened = untrack(() => ticket);
	let name = $state(opened.name);
	let start = $state(opened.schedule?.start ?? '');
	let due = $state(opened.schedule?.due ?? '');
	let halfDated = $state(false);
	let saving = $state(false);
	// Once closed (saved or undone), the focus leaving as the fields go must
	// not save again.
	let closed = false;

	function close(): void {
		closed = true;
		onClose();
	}

	// Enter (or leaving the fields) saves only what changed, name first, and
	// stops at the first refusal so the fields stay open with the user's input.
	async function save(): Promise<void> {
		if (saving || closed) return;
		const dates = readSchedule(start, due);
		halfDated = dates === null;
		if (dates === null) return;
		saving = true;
		const saved = await sendChanges(dates.schedule);
		saving = false;
		if (saved) close();
	}

	async function sendChanges(schedule: Ticket['schedule']): Promise<boolean> {
		const ticketId = ticket.id;
		if (name !== ticket.name) {
			if (!(await onEdit({ kind: 'renameTicket', ticketId, name }))) return false;
		}
		if (JSON.stringify(schedule) === JSON.stringify(ticket.schedule)) return true;
		return onEdit({ kind: 'setSchedule', ticketId, schedule });
	}

	function submit(event: SubmitEvent): void {
		event.preventDefault();
		void save();
	}

	// Leaving the fields for elsewhere on the page saves. Moving between them
	// doesn't, and nor does switching to another window or tab.
	function leave(event: FocusEvent & { currentTarget: HTMLFormElement }): void {
		const next = event.relatedTarget;
		if (next instanceof Node && event.currentTarget.contains(next)) return;
		if (!document.hasFocus()) return;
		void save();
	}

	// A press inside the editor that isn't on a field (the ×, the gaps, the
	// "to") keeps focus where it is. Otherwise browsers that don't focus a
	// pressed button (Firefox and Safari on macOS) would see focus leave, and
	// the editor would save and close before the press did anything.
	function keepFocus(event: PointerEvent): void {
		if (!(event.target instanceof HTMLInputElement)) event.preventDefault();
	}

	function undoOnEscape(event: KeyboardEvent): void {
		if (event.key !== 'Escape') return;
		event.preventDefault();
		close();
	}

	function focusName(field: HTMLInputElement): void {
		field.focus();
		field.select();
	}
</script>

<!-- The name and dates become fields where they stand, with no labels and no
     Save button shown: Enter or leaving saves, Escape undoes. When they open,
     the fields take the place, font and look of the text, so a one-line name
     and its line of dates stay where they were. Two things change the height:
     a long name that wraps is one line in its field, and a card with no dates
     gets a dates row. A dashed outline shows the fields are being edited. -->
<form
	class="editor"
	class:view={size === 'view'}
	aria-label="Edit {ticket.id}"
	onsubmit={submit}
	onfocusout={leave}
	onpointerdown={keepFocus}
	data-no-lift
>
	<label class="name-row">
		<span class="visually-hidden">Name</span>
		<input
			class="name"
			bind:value={name}
			maxlength={textCharsMax}
			onkeydown={undoOnEscape}
			{@attach focusName}
		/>
	</label>
	<div class="dates">
		<label>
			<span class="visually-hidden">Start</span>
			<input type="date" bind:value={start} title="Start" onkeydown={undoOnEscape} />
		</label>
		<span class="to" aria-hidden="true">to</span>
		<label>
			<span class="visually-hidden">Due</span>
			<input type="date" bind:value={due} title="Due" onkeydown={undoOnEscape} />
		</label>
		<button
			type="button"
			class="clear"
			aria-label="Clear the dates"
			title="Not scheduled"
			onkeydown={undoOnEscape}
			onclick={() => {
				start = '';
				due = '';
			}}>×</button
		>
	</div>
	{#if halfDated}
		<p class="problem" role="alert">Give both dates, or neither.</p>
	{/if}
	<!-- This button lets Enter in any field submit, and names the action for screen readers. -->
	<button type="submit" class="visually-hidden" disabled={saving} onkeydown={undoOnEscape}
		>Save</button
	>
</form>

<style>
	.editor {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
	}

	label {
		display: block;
		min-width: 0;
	}

	/* On a card a field looks like the text it replaces: no box, no padding,
	   the same font; only an outline, dashed like the "+ New ticket" line,
	   shows. */
	input {
		box-sizing: border-box;
		min-width: 0;
		padding: 0;
		border: none;
		border-radius: 0;
		background: none;
		font: inherit;
		color: inherit;
		/* The outline is dashed at rest, and solid and darker where you are
		   typing. On a card it sits just clear of the text, so neighbouring
		   outlines touch rather than cross. The dashed grey is 3:1 on a card but
		   a little under that on the page background. It is kept light by
		   choice, because the text itself shows the field. */
		outline: 1px dashed #8c959f;
		outline-offset: 2px;
	}

	input:focus {
		outline: 1px solid #59636e;
	}

	/* On the open ticket a field is a box like the description below it: the
	   outline on its own edge, lined up with the description's, and the text
	   inside by the same 8px. The heading and the line of dates the fields replace
	   have the same padding, so nothing moves when the pencil opens them. */
	.view input {
		padding: 2px 8px;
		outline-offset: -1px;
	}

	/* The name row has the margins and font of the heading it replaces. */
	.name-row {
		margin: 2px 0 6px;
		font-size: 0.95rem;
		font-weight: bold;
	}

	.view .name-row {
		margin: 6px 0;
		font-size: 1.2rem;
	}

	.name {
		width: 100%;
	}

	/* The dates row has the margins and font of the line of dates. */
	.dates {
		display: flex;
		gap: 6px;
		align-items: baseline;
		margin: 0 0 6px;
		font-size: 0.85rem;
		color: #59636e;
	}

	.view .dates {
		margin: 0 0 8px;
	}

	.dates label {
		flex: 0 1 8.5em;
	}

	/* The label is wider by the padding, so a date still fits. */
	.view .dates label {
		flex-basis: calc(8.5em + 16px);
	}

	/* A date box is exactly one line high, because Chromium's date boxes are
	   otherwise a little taller than the line of dates they replace. */
	.dates input {
		width: 100%;
		height: 1lh;
	}

	/* On the open ticket the box is one line plus the padding high, so it
	   holds the date. */
	.view .dates input {
		height: calc(1lh + 4px);
	}

	.clear {
		padding: 0 4px;
		border: none;
		border-radius: 4px;
		background: none;
		font: inherit;
		color: #59636e;
		cursor: pointer;
	}

	.clear:hover {
		background: #eceef1;
	}

	/* On the open ticket the editor stays about as wide as what it edits. */
	.editor.view {
		max-width: 32em;
	}

	.problem {
		margin: 0 0 6px;
		font-size: 0.85rem;
		color: #cf222e;
	}
</style>
