<script lang="ts">
	import { tick } from 'svelte';
	import type { Ticket, TicketComment } from '../types';
	import { commentCharsMax } from '../types';
	import { displayTime } from './dates';
	import type { OnEdit } from './edits';

	interface Props {
		ticket: Ticket;
		// The comments shown are this ticket's and those of every ticket below
		// it, oldest first.
		shown: TicketComment[];
		onEdit: OnEdit;
		onOpen: (id: string) => void;
		onClose: () => void;
	}

	let { ticket, shown, onEdit, onOpen, onClose }: Props = $props();

	let text = $state('');
	let box: HTMLTextAreaElement | null = null;
	let list: HTMLOListElement | null = null;
	// It is true while a comment is being added, so a second press can't add it twice.
	let sending = $state(false);

	async function add(): Promise<void> {
		if (sending || text.trim() === '') return;
		sending = true;
		const sent = text;
		const added = await onEdit({ kind: 'addComment', ticketId: ticket.id, text: sent });
		sending = false;
		if (!added) return;
		// Anything typed while it was being added is the next comment, so it stays.
		if (text === sent) text = '';
		await tick();
		// Once it is empty again it shrinks back to one line.
		if (box !== null) fit(box);
		toNewest();
	}

	// The newest comment is at the bottom, next to the box.
	function toNewest(): void {
		if (list === null) return;
		list.scrollTop = list.scrollHeight;
	}

	// A box that grows, or the Add button showing, makes the list shorter, so
	// a list that was at the newest comment stays there instead of sliding
	// under the box. The button shows only after the update, so it waits.
	async function onBoxInput(event: Event & { currentTarget: HTMLTextAreaElement }): Promise<void> {
		const atNewest = list !== null && list.scrollHeight - list.scrollTop - list.clientHeight < 1;
		fit(event.currentTarget);
		await tick();
		if (atNewest) toNewest();
	}

	// Cmd or Ctrl with Enter adds; plain Enter is a new line.
	function onBoxKey(event: KeyboardEvent): void {
		if (event.key !== 'Enter' || !(event.metaKey || event.ctrlKey)) return;
		event.preventDefault();
		void add();
	}

	// The height covers the text and the border, which `scrollHeight` leaves
	// out, so the box never scrolls before it reaches its limit.
	function fit(textarea: HTMLTextAreaElement): void {
		textarea.style.height = 'auto';
		const border = textarea.offsetHeight - textarea.clientHeight;
		textarea.style.height = `${textarea.scrollHeight + border}px`;
	}
</script>

<section class="comments" aria-labelledby="comments-{ticket.id}">
	<div class="top">
		<h3 id="comments-{ticket.id}">
			Comments <span class="count">{shown.length}</span>
		</h3>
		<button
			type="button"
			class="close"
			aria-label="Close the comments"
			title="Close"
			onclick={onClose}>×</button
		>
	</div>
	{#if shown.length > 0}
		<!-- It scrolls on its own, between the heading and the box. -->
		<ol
			class="list"
			{@attach (opened) => {
				list = opened;
				toNewest();
				// The list goes when the last comment is deleted, so it lets go of it.
				return () => {
					list = null;
				};
			}}
		>
			{#each shown as comment (comment.id)}
				<li class="comment">
					<p class="meta">
						<time datetime={comment.at}>{displayTime(comment.at)}</time>
						{#if comment.ticketId !== ticket.id}
							<!-- Written on a ticket below this one: its ID opens it. -->
							<button
								type="button"
								class="on"
								aria-label="Open {comment.ticketId}"
								title="Open {comment.ticketId}"
								onclick={() => onOpen(comment.ticketId)}>{comment.ticketId}</button
							>
						{/if}
						<button
							type="button"
							class="remove"
							aria-label="Delete the comment of {displayTime(comment.at)} on {comment.ticketId}"
							aria-describedby="comment-{comment.id}"
							title="Delete"
							onclick={() => onEdit({ kind: 'removeComment', commentId: comment.id })}
						>
							<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
								<path
									d="M6 2h4l.5 1H13v1.5H3V3h2.5L6 2zm-2 3.5h8l-.6 8a1 1 0 0 1-1 .9H5.6a1 1 0 0 1-1-.9l-.6-8z"
									fill="currentColor"
								/>
							</svg>
						</button>
					</p>
					<p class="text" id="comment-{comment.id}">{comment.text}</p>
				</li>
			{/each}
		</ol>
	{/if}
	<div class="bottom">
		<label class="write">
			<span class="visually-hidden">Write a comment</span>
			<textarea
				bind:value={text}
				rows="1"
				maxlength={commentCharsMax}
				placeholder="Write a comment"
				title="Cmd or Ctrl and Enter adds it"
				onkeydown={onBoxKey}
				oninput={onBoxInput}
				{@attach (opened) => {
					box = opened;
					fit(opened);
				}}></textarea>
		</label>
		<!-- A button as well as Cmd or Ctrl and Enter, so a comment can be added
		     from a touch screen's keyboard too; it shows once there is text. -->
		{#if text.trim() !== ''}
			<button type="button" class="add" disabled={sending} onclick={add}>Add</button>
		{/if}
	</div>
</section>

<style>
	/* The panel fills its sidebar: the heading at the top, the box at the
	   bottom like a chat, and between them the list, which scrolls on its own. */
	.comments {
		display: flex;
		flex-direction: column;
		height: 100%;
		min-width: 0;
		font-size: 0.9rem;
	}

	.top {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
	}

	.close {
		padding: 0 6px;
		border: none;
		border-radius: 4px;
		background: none;
		font: inherit;
		font-size: 1.1rem;
		color: #59636e;
		cursor: pointer;
	}

	.close:hover {
		background: #eceef1;
	}

	h3 {
		display: flex;
		gap: 6px;
		align-items: baseline;
		margin: 6px 0 8px;
		font-size: 0.9rem;
	}

	.count {
		font-weight: normal;
		color: #59636e;
	}

	/* It is pushed to the bottom even when there is no list above it. */
	.bottom {
		margin-top: auto;
		padding-top: 12px;
		border-top: 1px solid #d1d9e0;
	}

	.write {
		display: block;
	}

	/* A full-width box with a dashed border that turns solid while typing. It
	   grows with the text up to a limit, then scrolls, so the list stays in
	   view. */
	textarea {
		display: block;
		box-sizing: border-box;
		width: 100%;
		max-height: 40dvh;
		padding: 6px 8px;
		border: 1px dashed #8c959f;
		border-radius: 0;
		background: none;
		font: inherit;
		color: inherit;
		resize: none;
		overflow-y: auto;
	}

	textarea:focus {
		border-style: solid;
		border-color: #59636e;
		outline: none;
	}

	textarea::placeholder {
		color: #59636e;
	}

	.add {
		display: block;
		margin: 8px 0 0 auto;
		padding: 2px 10px;
		border: 1px solid #8c959f;
		border-radius: 6px;
		background: #fff;
		font: inherit;
		font-size: 0.85rem;
		color: inherit;
		cursor: pointer;
	}

	.add:hover {
		background: #eceef1;
	}

	.list {
		flex: 1;
		min-height: 0;
		margin: 6px 0 0;
		padding: 0;
		overflow-y: auto;
		list-style: none;
	}

	.comment {
		padding: 6px 0;
		border-top: 1px solid #d1d9e0;
	}

	.meta {
		display: flex;
		gap: 8px;
		align-items: center;
		margin: 0 0 2px;
		font-size: 0.8rem;
		color: #59636e;
	}

	.on {
		padding: 0;
		border: none;
		background: none;
		font: inherit;
		color: inherit;
		cursor: pointer;
	}

	.on:hover {
		text-decoration: underline;
	}

	/* The trash icon shows only while the comment is hovered or it has focus. */
	.remove {
		display: flex;
		margin-left: auto;
		padding: 2px;
		border: none;
		border-radius: 4px;
		background: none;
		color: #59636e;
		cursor: pointer;
		opacity: 0;
		transition: opacity var(--duration-short) var(--easing);
	}

	.comment:hover .remove,
	.remove:focus-visible {
		opacity: 1;
	}

	@media (hover: none) {
		.remove {
			opacity: 1;
		}
	}

	.remove:hover {
		color: #cf222e;
	}

	.text {
		margin: 0;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}
</style>
