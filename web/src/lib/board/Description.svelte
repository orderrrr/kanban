<script lang="ts">
	import { tick } from 'svelte';
	import type { Ticket } from '../types';
	import { descriptionCharsMax } from '../types';
	import type { OnEdit } from './edits';

	interface Props {
		ticket: Ticket;
		onEdit: OnEdit;
	}

	let { ticket, onEdit }: Props = $props();

	// What is being typed while the description is open for editing, or null
	// while it is only shown.
	let draft = $state<string | null>(null);
	let saving = $state(false);
	let box: HTMLTextAreaElement | null = null;

	function open(): void {
		draft = ticket.description;
	}

	// Leaving the box saves; an unchanged description sends nothing. A refused
	// save keeps the box open with what was typed.
	async function save(): Promise<void> {
		if (draft === null || saving) return;
		if (draft === ticket.description) {
			draft = null;
			return;
		}
		saving = true;
		const saved = await onEdit({
			kind: 'setDescription',
			ticketId: ticket.id,
			description: draft
		});
		saving = false;
		if (saved) {
			draft = null;
			return;
		}
		// Focus left to save; bring it back so the typed text isn't left behind,
		// once the box is enabled again.
		await tick();
		box?.focus();
	}

	// Escape gives up; Cmd or Ctrl with Enter saves (plain Enter is a new line).
	function onBoxKey(event: KeyboardEvent & { currentTarget: HTMLTextAreaElement }): void {
		if (event.key === 'Escape') {
			event.preventDefault();
			draft = null;
		}
		if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
			event.preventDefault();
			event.currentTarget.blur();
		}
	}

	// The box grows with the text instead of scrolling inside itself.
	function fit(box: HTMLTextAreaElement): void {
		box.style.height = 'auto';
		box.style.height = `${box.scrollHeight}px`;
	}

	// It opens focused, at the height of what is already written.
	function openBox(opened: HTMLTextAreaElement): () => void {
		box = opened;
		fit(opened);
		opened.focus();
		return () => {
			box = null;
		};
	}
</script>

{#if draft === null}
	<button
		type="button"
		class="description"
		class:empty={ticket.description === ''}
		aria-label={ticket.description === '' ? undefined : 'Edit the description'}
		aria-describedby={ticket.description === '' ? undefined : `description-${ticket.id}`}
		title="Edit the description"
		onclick={open}
	>
		{#if ticket.description === ''}
			Add a description
		{:else}
			<!-- Named for what it does; the text is read out after the name. -->
			<span id="description-{ticket.id}">{ticket.description}</span>
		{/if}
	</button>
{:else}
	<label class="editing">
		<span class="visually-hidden">Description</span>
		<textarea
			bind:value={draft}
			maxlength={descriptionCharsMax}
			rows="1"
			placeholder="Add a description"
			disabled={saving}
			onkeydown={onBoxKey}
			oninput={(event) => fit(event.currentTarget)}
			onblur={save}
			{@attach openBox}></textarea>
	</label>
{/if}

<style>
	/* Reads as plain text, line breaks kept, until it is clicked. */
	.description {
		display: block;
		box-sizing: border-box;
		width: 100%;
		max-width: 70ch;
		/* The box's left edge lines up with the name above, and its text sits
		   inside by the padding; the outline is drawn on the box's own edge, so
		   it takes no room and never reaches past the name. */
		margin: 0 0 16px;
		padding: 6px 8px;
		border: none;
		/* On hover or keyboard focus it shows a dashed square outline, like the
		   "+ New ticket" line. */
		border-radius: 0;
		outline: 1px dashed transparent;
		outline-offset: -1px;
		background: none;
		font: inherit;
		font-size: 0.9rem;
		color: inherit;
		text-align: left;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		cursor: text;
		transition: outline-color var(--duration-short) var(--easing);
	}

	.description:hover,
	.description:focus-visible {
		outline-color: #8c959f;
	}

	.empty {
		color: #59636e;
	}

	/* The box starts at the same edge as the name, never past it. */
	.editing {
		display: block;
		max-width: 70ch;
		margin: 0 0 16px;
		/* The same size as the shown text, so 70ch is the same width and lines
		   wrap in the same places. */
		font-size: 0.9rem;
	}

	/* The box looks exactly like the text it replaces, with the same padding,
	   so nothing moves when it opens; the solid outline shows it is being
	   edited. */
	textarea {
		display: block;
		box-sizing: border-box;
		width: 100%;
		padding: 6px 8px;
		border: none;
		border-radius: 0;
		background: none;
		font: inherit;
		color: inherit;
		resize: none;
		overflow: hidden;
		outline: 1px solid #59636e;
		outline-offset: -1px;
	}

	textarea::placeholder {
		color: #59636e;
	}
</style>
