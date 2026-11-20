// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFakeApi } from '../lib/fake-api';
import LayoutWithPage from './LayoutWithPage.test.svelte';
import PageWithApi from './PageWithApi.test.svelte';

afterEach(() => {
	localStorage.clear();
	location.hash = '';
	vi.restoreAllMocks();
});

async function openTicket(name: string) {
	render(LayoutWithPage);
	await fireEvent.click(await screen.findByRole('button', { name }));
	await screen.findByRole('navigation', { name: 'Where this ticket sits' });
}

function column(name: string) {
	return within(screen.getByRole('region', { name }));
}

function columnIds(name: string): (string | undefined)[] {
	return column(name)
		.queryAllByRole('article')
		.map((article) => article.getAttribute('aria-label')?.split(' ')[0]);
}

function trail() {
	return within(screen.getByRole('navigation', { name: 'Where this ticket sits' }));
}

async function reload() {
	cleanup();
	render(LayoutWithPage);
	await screen.findByRole('navigation', { name: 'Where this ticket sits' });
}

describe('a ticket view', () => {
	it("opens from a ticket's name and shows its sub-tickets on the board by stage", async () => {
		await openTicket('Login page');
		expect(location.hash).toBe('#TL-1');
		expect(screen.getByRole('heading', { level: 2, name: 'Login page' })).toBeTruthy();
		expect(columnIds('Backlog')).toEqual(['TL-119']);
		expect(columnIds('To do')).toEqual(['TL-7']);
		expect(columnIds('In progress')).toEqual(['TL-4']);
		expect(columnIds('Done')).toEqual(['TL-2', 'TL-3']);
	});

	it('shows the next level down on each card, and opens it from there', async () => {
		await openTicket('Login page');
		const develop = within(screen.getByRole('article', { name: /^TL-4 / }));
		expect(develop.getByRole('progressbar', { name: '1 done, 1 to do' })).toBeTruthy();
		await fireEvent.click(develop.getByRole('button', { name: 'Develop with tests' }));
		expect(location.hash).toBe('#TL-4');
		await screen.findByRole('heading', { level: 2, name: 'Develop with tests' });
		expect(trail().getByRole('button', { name: 'TL-1' })).toBeTruthy();
		expect(columnIds('Done')).toEqual(['TL-5']);
	});

	it('goes back up the trail, and reopens from the address', async () => {
		render(LayoutWithPage);
		await screen.findByRole('article', { name: /^TL-1 / });
		location.hash = 'TL-4';
		window.dispatchEvent(new HashChangeEvent('hashchange'));
		await screen.findByRole('navigation', { name: 'Where this ticket sits' });
		await fireEvent.click(trail().getByRole('button', { name: 'TL-1' }));
		expect(location.hash).toBe('#TL-1');
		expect(await screen.findByRole('heading', { level: 2, name: 'Login page' })).toBeTruthy();
		await fireEvent.click(trail().getByRole('button', { name: 'All tickets' }));
		expect(await screen.findByRole('article', { name: /^TL-8 / })).toBeTruthy();
		expect(screen.queryByRole('navigation', { name: 'Where this ticket sits' })).toBeNull();
	});

	it('adds a sub-ticket here from the new line, numbered, kept after a reload', async () => {
		await openTicket('Disk space alert');
		await fireEvent.click(screen.getByRole('button', { name: '+ New ticket' }));
		const line = screen.getByLabelText('New ticket');
		await fireEvent.input(line, { target: { value: 'Write the rule' } });
		await fireEvent.keyDown(line, { key: 'Enter' });
		expect(await screen.findByRole('article', { name: 'TL-120 Write the rule' })).toBeTruthy();
		await reload();
		expect(columnIds('Backlog')).toEqual(['TL-120']);
	});

	it('adds a sub-ticket with the next ID', async () => {
		await openTicket('Disk space alert');
		await fireEvent.click(screen.getByRole('button', { name: '+ New ticket' }));
		const line = screen.getByLabelText('New ticket');
		await fireEvent.input(line, { target: { value: 'Alert copy' } });
		await fireEvent.keyDown(line, { key: 'Enter' });
		expect(await screen.findByRole('article', { name: 'TL-120 Alert copy' })).toBeTruthy();
	});

	it('moves a sub-ticket across stages with Alt and the arrow keys on its grip', async () => {
		await openTicket('Login page');
		await fireEvent.keyDown(screen.getByRole('button', { name: 'Move TL-7' }), {
			key: 'ArrowRight',
			altKey: true
		});
		await vi.waitFor(() => expect(columnIds('In progress')).toEqual(['TL-4', 'TL-7']));
		await reload();
		expect(columnIds('To do')).toEqual([]);
	});

	it('closes the editor when another ticket opens, so it never saves onto that one', async () => {
		await openTicket('Login page');
		await fireEvent.click(screen.getByRole('button', { name: 'Edit TL-1' }));
		await fireEvent.click(screen.getByRole('button', { name: 'Develop with tests' }));
		expect(
			await screen.findByRole('heading', { level: 2, name: 'Develop with tests' })
		).toBeTruthy();
		expect(screen.queryByRole('form', { name: /^Edit / })).toBeNull();
	});

	it('keeps the name as a heading while the pencil is replaced by the fields', async () => {
		await openTicket('Login page');
		await fireEvent.click(screen.getByRole('button', { name: 'Edit TL-1' }));
		expect(screen.getByRole('heading', { level: 2, name: 'Login page' })).toBeTruthy();
		expect(screen.queryByRole('button', { name: 'Edit TL-1' })).toBeNull();
		expect(screen.getByRole('form', { name: 'Edit TL-1' })).toBeTruthy();
	});

	it('keeps saying "Add a description" in the empty box once it is open', async () => {
		await openTicket('Disk space alert');
		await fireEvent.click(screen.getByRole('button', { name: 'Add a description' }));
		expect(screen.getByLabelText('Description').getAttribute('placeholder')).toBe(
			'Add a description'
		);
	});

	it('renames the open ticket from its pencil', async () => {
		await openTicket('Disk space alert');
		await fireEvent.click(screen.getByRole('button', { name: 'Edit TL-17' }));
		const editor = within(screen.getByRole('form', { name: 'Edit TL-17' }));
		await fireEvent.input(editor.getByLabelText('Name'), { target: { value: 'Disk alerts' } });
		await fireEvent.click(editor.getByRole('button', { name: 'Save' }));
		expect(await screen.findByRole('heading', { level: 2, name: 'Disk alerts' })).toBeTruthy();
	});

	it('shows the description with its line breaks, edits it on click, and saves on leaving', async () => {
		await openTicket('Login page');
		const shown = screen.getByRole('button', {
			name: 'Edit the description',
			description: /^Users sign in with their email/
		});
		expect(shown.textContent).toContain('password.\n\nNeeds');
		await fireEvent.click(shown);
		const box = screen.getByLabelText('Description');
		expect(document.activeElement).toBe(box);
		await fireEvent.input(box, { target: { value: 'Sign in by email.\nWith a reset link.' } });
		await fireEvent.blur(box);
		expect(await screen.findByRole('button', { description: /^Sign in by email\./ })).toBeTruthy();
		await reload();
		expect(
			screen.getByRole('button', { description: /^Sign in by email\./ }).textContent
		).toContain('email.\nWith a reset');
	});

	it('offers to add one when there is none, and Escape puts the saved text back', async () => {
		await openTicket('Disk space alert');
		await fireEvent.click(screen.getByRole('button', { name: 'Add a description' }));
		const box = screen.getByLabelText('Description');
		await fireEvent.input(box, { target: { value: 'Thrown away' } });
		await fireEvent.keyDown(box, { key: 'Escape' });
		expect(screen.getByRole('button', { name: 'Add a description' })).toBeTruthy();
		await reload();
		expect(screen.getByRole('button', { name: 'Add a description' })).toBeTruthy();
	});

	it('saves with Cmd or Ctrl and Enter, keeping plain Enter as a new line', async () => {
		await openTicket('Disk space alert');
		await fireEvent.click(screen.getByRole('button', { name: 'Add a description' }));
		const box = screen.getByLabelText('Description');
		await fireEvent.input(box, { target: { value: 'One line' } });
		const enter = await fireEvent.keyDown(box, { key: 'Enter' });
		expect(enter).toBe(true);
		expect(screen.getByLabelText('Description')).toBeTruthy();
		await fireEvent.keyDown(box, { key: 'Enter', metaKey: true });
		expect(
			await screen.findByRole('button', { name: 'Edit the description', description: 'One line' })
		).toBeTruthy();
	});

	it('clears the description when it is emptied', async () => {
		await openTicket('Login page');
		await fireEvent.click(
			screen.getByRole('button', { name: 'Edit the description', description: /^Users sign in/ })
		);
		const box = screen.getByLabelText('Description');
		await fireEvent.input(box, { target: { value: '   ' } });
		await fireEvent.blur(box);
		expect(await screen.findByRole('button', { name: 'Add a description' })).toBeTruthy();
	});

	it('keeps cards free of descriptions', async () => {
		render(LayoutWithPage);
		const card = await screen.findByRole('article', { name: /^TL-1 / });
		expect(card.textContent).not.toContain('Users sign in');
	});

	it('keeps the box open, focused and with what was typed when the save is refused', async () => {
		await openTicket('Disk space alert');
		await fireEvent.click(screen.getByRole('button', { name: 'Add a description' }));
		const box = screen.getByLabelText('Description');
		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new Error('storage full');
		});
		vi.spyOn(console, 'error').mockImplementation(() => {});
		await fireEvent.input(box, { target: { value: 'Kept after a refusal' } });
		// Really moves focus away, as leaving the box does.
		box.blur();
		expect((await screen.findByRole('alert')).textContent).toContain('Something went wrong');
		const still = screen.getByLabelText('Description');
		expect(still).toBeInstanceOf(HTMLTextAreaElement);
		if (still instanceof HTMLTextAreaElement) expect(still.value).toBe('Kept after a refusal');
		expect(document.activeElement).toBe(still);
	});

	it('sends nothing when the description is left unchanged', async () => {
		await openTicket('Login page');
		await fireEvent.click(
			screen.getByRole('button', { name: 'Edit the description', description: /^Users sign in/ })
		);
		const saves = vi.spyOn(Storage.prototype, 'setItem');
		await fireEvent.blur(screen.getByLabelText('Description'));
		expect(
			screen.getByRole('button', { name: 'Edit the description', description: /^Users sign in/ })
		).toBeTruthy();
		expect(saves).not.toHaveBeenCalled();
	});

	// Opens the comments sidebar if it is closed, and gives what is in it.
	async function openComments() {
		const toggle = screen.getByRole('button', { name: /^Comments/ });
		if (toggle.getAttribute('aria-expanded') !== 'true') await fireEvent.click(toggle);
		return within(await screen.findByRole('region', { name: /^Comments/ }));
	}

	function commentsPanel() {
		return within(screen.getByRole('region', { name: /^Comments/ }));
	}

	// It gives each comment as read, oldest first: its text, after the ticket
	// it was written on when that ticket is below this one.
	function commentLines(): string[] {
		return commentsPanel()
			.getAllByRole('listitem')
			.map((item) => {
				// The comment is the item's last paragraph, after its time and tag.
				const text = within(item).getAllByRole('paragraph').at(-1)?.textContent ?? '';
				const on = within(item).queryByRole('button', { name: /^Open / });
				return on === null ? text : `${on.textContent}: ${text}`;
			});
	}

	it('opens the comments in a sidebar from the header, and closes it with its × or Escape', async () => {
		await openTicket('Login page');
		expect(screen.getByRole('button', { name: 'Comments 4' })).toBeTruthy();
		expect(screen.queryByRole('region', { name: /^Comments/ })).toBeNull();
		const panel = await openComments();
		await fireEvent.click(panel.getByRole('button', { name: 'Close the comments' }));
		expect(screen.queryByRole('region', { name: /^Comments/ })).toBeNull();
		await openComments();
		await fireEvent.keyDown(window, { key: 'Escape' });
		expect(screen.queryByRole('region', { name: /^Comments/ })).toBeNull();
	});

	it("shows a ticket's comments with those of every ticket below it, oldest first, tagged", async () => {
		await openTicket('Login page');
		await openComments();
		expect(commentLines()).toEqual([
			'TL-2: Design note written and approved.',
			'Kick-off done. Session store agreed with the platform team.',
			'TL-4: Handler done; waiting on test data for the unit tests.',
			'TL-6: Test data arrived.\nTwo cases still failing on rounding.'
		]);
	});

	it("shows only a sub-ticket's own comments and those below it, and opens a tagged one", async () => {
		await openTicket('Login page');
		const panel = await openComments();
		await fireEvent.click(panel.getByRole('button', { name: 'Open TL-4' }));
		await screen.findByRole('heading', { level: 2, name: 'Develop with tests' });
		// The sidebar stays open on the ticket it opened.
		expect(screen.getByRole('region', { name: /^Comments/ })).toBeTruthy();
		expect(commentLines()).toEqual([
			'Handler done; waiting on test data for the unit tests.',
			'TL-6: Test data arrived.\nTwo cases still failing on rounding.'
		]);
	});

	it('adds a comment with Cmd or Ctrl and Enter, not plain Enter, kept after a reload', async () => {
		await openTicket('Disk space alert');
		const panel = await openComments();
		const box = panel.getByLabelText('Write a comment');
		await fireEvent.input(box, { target: { value: 'First thoughts' } });
		await fireEvent.keyDown(box, { key: 'Enter' });
		expect(panel.queryAllByRole('listitem')).toHaveLength(0);
		await fireEvent.keyDown(box, { key: 'Enter', metaKey: true });
		await vi.waitFor(() => expect(commentLines()).toEqual(['First thoughts']));
		await fireEvent.input(box, { target: { value: 'Second thoughts' } });
		await fireEvent.keyDown(box, { key: 'Enter', ctrlKey: true });
		await vi.waitFor(() => expect(commentLines()).toEqual(['First thoughts', 'Second thoughts']));
		expect(panel.getByLabelText('Write a comment')).toHaveProperty('value', '');
		await reload();
		await openComments();
		expect(commentLines()).toEqual(['First thoughts', 'Second thoughts']);
	});

	interface Scroll {
		element: HTMLElement;
		comments: number;
		top: number;
	}

	// jsdom lays nothing out, so this gives every element a full height of
	// 900, and records each scroll with how many comments it showed then.
	function watchScroll(): Scroll[] {
		const scrolls: Scroll[] = [];
		vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(900);
		vi.spyOn(HTMLElement.prototype, 'scrollTop', 'set').mockImplementation(function (
			this: HTMLElement,
			top: number
		) {
			scrolls.push({
				element: this,
				comments: within(this).queryAllByRole('listitem').length,
				top
			});
		});
		return scrolls;
	}

	// It gives each scroll of the comments list: how many comments it showed,
	// and where it scrolled to.
	function listScrolls(scrolls: Scroll[]): { comments: number; top: number }[] {
		const list = commentsPanel().queryByRole('list');
		return scrolls
			.filter((scroll) => scroll.element === list)
			.map(({ comments, top }) => ({ comments, top }));
	}

	// It shows the list as 900 long, 300 high and scrolled to `top`, so its
	// newest comment is in view only when `top` is 600.
	function scrolledTo(top: number): void {
		vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(900);
		vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(300);
		vi.spyOn(HTMLElement.prototype, 'scrollTop', 'get').mockReturnValue(top);
	}

	it('opens the comments scrolled to the newest, next to the box', async () => {
		await openTicket('Login page');
		const scrolls = watchScroll();
		await openComments();
		expect(listScrolls(scrolls)).toContainEqual({ comments: 4, top: 900 });
	});

	it('scrolls to the newest comment again after adding one', async () => {
		await openTicket('Login page');
		const panel = await openComments();
		const scrolls = watchScroll();
		const box = panel.getByLabelText('Write a comment');
		await fireEvent.input(box, { target: { value: 'Latest' } });
		await fireEvent.keyDown(box, { key: 'Enter', ctrlKey: true });
		await vi.waitFor(() => expect(listScrolls(scrolls)).toContainEqual({ comments: 5, top: 900 }));
		expect(commentLines().at(-1)).toBe('Latest');
	});

	it('scrolls to the first comment added on a ticket that had none', async () => {
		await openTicket('Disk space alert');
		const panel = await openComments();
		const scrolls = watchScroll();
		const box = panel.getByLabelText('Write a comment');
		await fireEvent.input(box, { target: { value: 'First' } });
		await fireEvent.keyDown(box, { key: 'Enter', ctrlKey: true });
		await vi.waitFor(() => expect(listScrolls(scrolls)).toContainEqual({ comments: 1, top: 900 }));
	});

	it('makes the box as tall as its text and its border', async () => {
		await openTicket('Login page');
		const panel = await openComments();
		// At its one-line height the box is 18 inside and 20 with its border,
		// and the text in it is 54 high.
		vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(54);
		vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(18);
		vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(20);
		const box = panel.getByLabelText('Write a comment');
		await fireEvent.input(box, { target: { value: 'One\nTwo\nThree' } });
		expect(box.style.height).toBe('56px');
	});

	it('keeps the newest comment in view while the box grows', async () => {
		await openTicket('Login page');
		const panel = await openComments();
		const scrolls = watchScroll();
		scrolledTo(600);
		await fireEvent.input(panel.getByLabelText('Write a comment'), {
			target: { value: 'One\nTwo\nThree' }
		});
		await vi.waitFor(() => expect(listScrolls(scrolls)).toEqual([{ comments: 4, top: 900 }]));
	});

	it('counts a list less than a pixel from the end as at the newest comment', async () => {
		await openTicket('Login page');
		const panel = await openComments();
		const scrolls = watchScroll();
		scrolledTo(599.5);
		await fireEvent.input(panel.getByLabelText('Write a comment'), { target: { value: 'One' } });
		await vi.waitFor(() => expect(listScrolls(scrolls)).toEqual([{ comments: 4, top: 900 }]));
	});

	it('leaves a list scrolled up to older comments where it is while typing', async () => {
		await openTicket('Login page');
		const panel = await openComments();
		const scrolls = watchScroll();
		scrolledTo(599);
		await fireEvent.input(panel.getByLabelText('Write a comment'), { target: { value: 'One' } });
		await new Promise((resolve) => setTimeout(resolve));
		expect(listScrolls(scrolls)).toEqual([]);
	});

	it('keeps the text and does not scroll when a comment fails to save', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		await openTicket('Login page');
		const panel = await openComments();
		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new Error('storage full');
		});
		const box = panel.getByLabelText('Write a comment');
		await fireEvent.input(box, { target: { value: 'Not saved' } });
		const scrolls = watchScroll();
		await fireEvent.keyDown(box, { key: 'Enter', ctrlKey: true });
		await screen.findByRole('alert');
		expect(box).toHaveProperty('value', 'Not saved');
		expect(commentLines()).toHaveLength(4);
		expect(listScrolls(scrolls)).toEqual([]);
	});

	it('keeps what is typed while a comment is being added, as the next comment', async () => {
		const api = createFakeApi(localStorage, '2026-11-03', () => new Date('2026-11-03T09:00:00Z'));
		const addComment = api.addComment.bind(api);
		let release = () => {};
		vi.spyOn(api, 'addComment').mockImplementation(async (ticketId, text) => {
			await new Promise<void>((resolve) => (release = resolve));
			return addComment(ticketId, text);
		});
		location.hash = 'TL-17';
		render(PageWithApi, { api });
		await screen.findByRole('navigation', { name: 'Where this ticket sits' });
		const panel = await openComments();
		const box = panel.getByLabelText('Write a comment');
		await fireEvent.input(box, { target: { value: 'Sent' } });
		await fireEvent.keyDown(box, { key: 'Enter', ctrlKey: true });
		await fireEvent.input(box, { target: { value: 'Sent, then more' } });
		release();
		await vi.waitFor(() => expect(commentLines()).toEqual(['Sent']));
		expect(box).toHaveProperty('value', 'Sent, then more');
	});

	it('adds with an Add button that shows once there is text, for touch screens', async () => {
		await openTicket('Disk space alert');
		const panel = await openComments();
		expect(panel.queryByRole('button', { name: 'Add' })).toBeNull();
		await fireEvent.input(panel.getByLabelText('Write a comment'), {
			target: { value: 'From a phone' }
		});
		await fireEvent.click(panel.getByRole('button', { name: 'Add' }));
		await vi.waitFor(() => expect(commentLines()).toEqual(['From a phone']));
	});

	it('adds nothing and says nothing for a blank comment', async () => {
		await openTicket('Disk space alert');
		const panel = await openComments();
		const box = panel.getByLabelText('Write a comment');
		await fireEvent.input(box, { target: { value: '  \n ' } });
		await fireEvent.keyDown(box, { key: 'Enter', ctrlKey: true });
		expect(panel.queryAllByRole('listitem')).toHaveLength(0);
		expect(screen.queryByRole('alert')).toBeNull();
		expect(panel.queryByRole('button', { name: 'Add' })).toBeNull();
	});

	it('tells delete buttons apart by their comment, even in the same minute', async () => {
		await openTicket('Disk space alert');
		const panel = await openComments();
		const box = panel.getByLabelText('Write a comment');
		for (const text of ['One', 'Two']) {
			await fireEvent.input(box, { target: { value: text } });
			await fireEvent.keyDown(box, { key: 'Enter', ctrlKey: true });
		}
		await vi.waitFor(() => expect(commentLines()).toHaveLength(2));
		expect(
			panel.getByRole('button', { name: /^Delete the comment/, description: 'Two' })
		).toBeTruthy();
		expect(
			panel.getByRole('button', { name: /^Delete the comment/, description: 'One' })
		).toBeTruthy();
	});

	it('deletes a comment with its trash icon', async () => {
		await openTicket('Login page');
		const panel = await openComments();
		const item = panel
			.getAllByRole('listitem')
			.find((each) => each.textContent?.includes('Kick-off done'));
		if (item === undefined) throw new Error('no kick-off comment');
		await fireEvent.click(within(item).getByRole('button', { name: /^Delete the comment/ }));
		await vi.waitFor(() => expect(commentLines()).toHaveLength(3));
		expect(commentLines().join()).not.toContain('Kick-off');
	});

	it('closes the sidebar on Escape only when nothing else uses it, keeping a half-written comment', async () => {
		await openTicket('Disk space alert');
		const panel = await openComments();
		const box = panel.getByLabelText('Write a comment');
		await fireEvent.input(box, { target: { value: 'Half written' } });
		await fireEvent.keyDown(box, { key: 'Escape' });
		expect(screen.getByRole('region', { name: /^Comments/ })).toBeTruthy();
		expect(screen.getByLabelText('Write a comment')).toHaveProperty('value', 'Half written');
		await fireEvent.click(screen.getByRole('button', { name: 'Add a description' }));
		await fireEvent.keyDown(screen.getByLabelText('Description'), { key: 'Escape' });
		expect(screen.getByRole('region', { name: /^Comments/ })).toBeTruthy();
	});

	it('puts focus back on the toggle when the sidebar is closed from inside it', async () => {
		await openTicket('Disk space alert');
		const panel = await openComments();
		const close = panel.getByRole('button', { name: 'Close the comments' });
		close.focus();
		await fireEvent.click(close);
		await vi.waitFor(() =>
			expect(document.activeElement).toBe(screen.getByRole('button', { name: /^Comments/ }))
		);
	});

	it('lists comments oldest first by when they were written, even at the same time or with the clock set back', async () => {
		// A clock that stands still for the first two comments, then goes back an hour.
		const times = ['2026-11-03T09:00:00Z', '2026-11-03T09:00:00Z', '2026-11-03T08:00:00Z'];
		let call = 0;
		const api = createFakeApi(
			localStorage,
			'2026-11-03',
			() => new Date(times[call++] ?? '2026-11-03T07:00:00Z')
		);
		location.hash = 'TL-17';
		render(PageWithApi, { api });
		await screen.findByRole('navigation', { name: 'Where this ticket sits' });
		const panel = await openComments();
		const box = panel.getByLabelText('Write a comment');
		for (const text of ['First', 'Second', 'Third']) {
			await fireEvent.input(box, { target: { value: text } });
			await fireEvent.keyDown(box, { key: 'Enter', ctrlKey: true });
		}
		await vi.waitFor(() => expect(commentLines()).toEqual(['First', 'Second', 'Third']));
	});

	it('keeps the sidebar open when Escape gives up on a box being drawn', async () => {
		await openTicket('Login page');
		await openComments();
		const region = screen.getByRole('region', { name: 'To do' });
		await fireEvent.pointerDown(region, { button: 0, isPrimary: true, clientX: 10, clientY: 10 });
		window.dispatchEvent(
			new PointerEvent('pointermove', { clientX: 60, clientY: 60, isPrimary: true })
		);
		await fireEvent.keyDown(window, { key: 'Escape' });
		await new Promise((resolve) => setTimeout(resolve));
		expect(screen.getByRole('region', { name: /^Comments/ })).toBeTruthy();
		window.dispatchEvent(new PointerEvent('pointerup', { isPrimary: true }));
	});

	it('opens a ticket from all tickets without its comments, even after they were open', async () => {
		await openTicket('Login page');
		await openComments();
		await fireEvent.click(trail().getByRole('button', { name: 'All tickets' }));
		await fireEvent.click(await screen.findByRole('button', { name: 'Search index' }));
		await screen.findByRole('heading', { level: 2, name: 'Search index' });
		expect(screen.queryByRole('region', { name: /^Comments/ })).toBeNull();
	});

	it('closes the sidebar on Escape during a press that has not yet become a box', async () => {
		await openTicket('Login page');
		await openComments();
		const region = screen.getByRole('region', { name: 'To do' });
		await fireEvent.pointerDown(region, { button: 0, isPrimary: true, clientX: 10, clientY: 10 });
		await fireEvent.keyDown(window, { key: 'Escape' });
		await vi.waitFor(() => expect(screen.queryByRole('region', { name: /^Comments/ })).toBeNull());
		window.dispatchEvent(new PointerEvent('pointerup', { isPrimary: true }));
	});
});
