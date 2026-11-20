<script lang="ts">
	import { textCharsMax } from '../types';
	import type { OnEdit } from './edits';

	interface Props {
		// New tickets go under this ticket, or at the top level when it is null.
		parent: string | null;
		onEdit: OnEdit;
	}

	let { parent, onEdit }: Props = $props();

	let open = $state(false);
	let text = $state('');
	// It is true while a ticket is being added, so a second Enter can't add it twice.
	let saving = $state(false);

	async function add(): Promise<boolean> {
		if (saving) return false;
		if (text.trim() === '') {
			close();
			return false;
		}
		saving = true;
		const sent = text;
		const added = await onEdit({ kind: 'createTicket', name: sent, schedule: null, parent });
		saving = false;
		// Anything typed while it was being added is the next ticket, so it stays.
		if (added && text === sent) text = '';
		return added;
	}

	function close(): void {
		open = false;
		text = '';
	}

	// Enter adds and keeps the line open for the next; Escape closes it.
	function keys(event: KeyboardEvent): void {
		if (event.key === 'Enter') {
			event.preventDefault();
			void add();
		}
		if (event.key === 'Escape') close();
	}

	// Leaving adds what was typed, then closes the line; switching to another
	// window or tab leaves it as it is.
	async function leave(): Promise<void> {
		if (!document.hasFocus()) return;
		if (text.trim() === '' || (await add())) close();
	}

	function focus(field: HTMLInputElement): void {
		field.focus();
	}
</script>

{#if open}
	<label class="line">
		<span class="visually-hidden">New ticket</span>
		<input
			bind:value={text}
			placeholder="Name"
			maxlength={textCharsMax}
			autocomplete="off"
			onkeydown={keys}
			onblur={leave}
			{@attach focus}
		/>
	</label>
{:else}
	<button type="button" class="line add" onclick={() => (open = true)}>+ New ticket</button>
{/if}

<style>
	/* The line sits like an empty card at the end of the column, but square,
	   like every text box. */
	.line {
		display: block;
		box-sizing: border-box;
		width: 100%;
		border: 1px dashed #8c959f;
		border-radius: 0;
		background: none;
		font: inherit;
		font-size: 0.9rem;
	}

	.add {
		padding: 8px 12px;
		color: #59636e;
		text-align: left;
		cursor: pointer;
		opacity: 0.7;
		transition: opacity var(--duration-short) var(--easing);
	}

	.add:hover,
	.add:focus-visible {
		opacity: 1;
	}

	label.line {
		border-style: solid;
		border-color: #d1d9e0;
		background: #fff;
	}

	input {
		box-sizing: border-box;
		width: 100%;
		padding: 8px 12px;
		border: none;
		border-radius: 0;
		background: none;
		font: inherit;
	}
</style>
