<script lang="ts">
	import { fly, slide } from 'svelte/transition';
	import Board from '../lib/board/Board.svelte';
	import TicketView from '../lib/board/TicketView.svelte';
	import type { BoardData, Edit } from '../lib/board/edits';
	import { failureMessage, isPageFault, send } from '../lib/board/edits';
	import { getApi, getToday } from '../lib/context';
	import { durationLong, durationShort, easing, motion } from '../lib/motion';

	const api = getApi();
	const today = getToday();

	type Load = { status: 'loading' } | { status: 'loaded'; board: BoardData } | { status: 'failed' };

	let load = $state<Load>({ status: 'loading' });
	// It holds the last refusal or failure, until a change works or it is dismissed.
	let message = $state<string | null>(null);
	// Whether a ticket's comments sidebar is open; kept here, so it stays open
	// when a tagged comment's ticket is opened from it.
	let commentsOpen = $state(false);

	// The open ticket lives in the address (`#TL-1`), so the browser's back
	// button returns to all tickets.
	let openId = $state(location.hash.slice(1));

	$effect(() => {
		const follow = () => {
			openId = location.hash.slice(1);
			// Back on all tickets, the next ticket opens without its comments.
			if (openId === '') commentsOpen = false;
		};
		window.addEventListener('hashchange', follow);
		return () => window.removeEventListener('hashchange', follow);
	});

	// Opens a ticket, or all tickets when null, through the address.
	function open(id: string | null): void {
		location.hash = id ?? '';
	}

	const openTicket = $derived(
		load.status === 'loaded' ? load.board.tickets.find((ticket) => ticket.id === openId) : undefined
	);

	$effect(() => {
		Promise.all([api.listTickets(), api.listComments()]).then(
			([tickets, comments]) => {
				load = { status: 'loaded', board: { tickets, comments } };
			},
			(error: unknown) => {
				console.error(error);
				load = { status: 'failed' };
			}
		);
	});

	// The one place board changes are made: send the edit, then apply what the
	// `Api` returned. Resolves to whether the change was saved.
	async function edit(change: Edit): Promise<boolean> {
		try {
			const apply = await send(api, change);
			if (load.status === 'loaded') {
				load = { status: 'loaded', board: apply(load.board) };
			}
			message = null;
			return true;
		} catch (error) {
			if (isPageFault(error)) console.error(error);
			message = failureMessage(error);
			return false;
		}
	}
</script>

<svelte:head>
	<title>Ticket Board</title>
</svelte:head>

<main>
	<h1>Ticket Board</h1>
	{#if load.status === 'failed'}
		<p role="alert">Something went wrong loading the board.</p>
	{:else if load.status === 'loading'}
		<p>Loading the board…</p>
	{:else}
		{#if message !== null}
			<div
				class="message"
				role="alert"
				transition:slide={{ duration: motion(durationShort), easing }}
			>
				<p>{message}</p>
				<button type="button" onclick={() => (message = null)}>Dismiss</button>
			</div>
		{/if}
		{#if openTicket === undefined}
			<div class="view" in:fly={{ y: 8, duration: motion(durationLong), easing }}>
				<Board tickets={load.board.tickets} parent={null} {today} onEdit={edit} onOpen={open} />
			</div>
		{:else}
			<!-- A fresh view for each ticket, so nothing typed for one (an open editor,
			     a half-filled form) carries over to the next. -->
			{#key openTicket.id}
				<div class="view" in:fly={{ y: 8, duration: motion(durationLong), easing }}>
					<TicketView
						ticket={openTicket}
						tickets={load.board.tickets}
						comments={load.board.comments}
						{today}
						onEdit={edit}
						onOpen={open}
						{commentsOpen}
						onComments={(next) => (commentsOpen = next)}
					/>
				</div>
			{/key}
		{/if}
	{/if}
</main>

<style>
	/* The board fills the window down to its bottom edge. */
	main {
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		padding: 16px 16px 0;
	}

	/* Each view slides in when it opens and fills the rest of the window. */
	.view {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.message {
		display: flex;
		gap: 12px;
		align-items: center;
		background: #fff1f0;
		border: 1px solid #cf222e;
		border-radius: 6px;
		padding: 4px 12px;
		margin-bottom: 12px;
	}

	h1 {
		font-size: 1.4rem;
		margin: 0 0 16px;
	}
</style>
