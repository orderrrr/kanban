// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { tick } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import LayoutWithPage from './LayoutWithPage.test.svelte';

afterEach(() => {
	localStorage.clear();
	location.hash = '';
	vi.restoreAllMocks();
});

async function openBoard() {
	render(LayoutWithPage);
	await screen.findByRole('article', { name: /^TL-1 / });
}

// Renders the page again from what was saved, as a reload would.
async function reload() {
	cleanup();
	await openBoard();
}

function card(name: RegExp) {
	return within(screen.getByRole('article', { name }));
}

function column(name: string) {
	return within(screen.getByRole('region', { name }));
}

function columnIds(name: string): (string | undefined)[] {
	return column(name)
		.getAllByRole('article')
		.map((article) => article.getAttribute('aria-label')?.split(' ')[0]);
}

function input(element: HTMLElement): HTMLInputElement {
	if (!(element instanceof HTMLInputElement)) throw new Error('expected an input');
	return element;
}

async function type(input: HTMLElement, value: string) {
	await fireEvent.input(input, { target: { value } });
}

// Opens the "+ New ticket" line at the end of Backlog and types into it.
async function openNewLine(text: string): Promise<HTMLElement> {
	await fireEvent.click(screen.getByRole('button', { name: '+ New ticket' }));
	const line = screen.getByLabelText('New ticket');
	await type(line, text);
	return line;
}

describe('creating a ticket', () => {
	it('adds it last in Backlog from the new line with the next ID, keeps the line open, and keeps it after a reload', async () => {
		await openBoard();
		const line = await openNewLine('Dark mode');
		await fireEvent.keyDown(line, { key: 'Enter' });
		expect(await screen.findByRole('article', { name: 'TL-120 Dark mode' })).toBeTruthy();
		expect(columnIds('Backlog').at(-1)).toBe('TL-120');
		expect(input(screen.getByLabelText('New ticket')).value).toBe('');
		// Still focused, so the next name can be typed straight away.
		expect(document.activeElement).toBe(screen.getByLabelText('New ticket'));
		await reload();
		expect(screen.getByRole('article', { name: 'TL-120 Dark mode' })).toBeTruthy();
	});

	it('takes the whole line as the name, even when it starts with an ID', async () => {
		await openBoard();
		const line = await openNewLine('DEV-2000 Dark mode');
		await fireEvent.keyDown(line, { key: 'Enter' });
		expect(await screen.findByRole('article', { name: 'TL-120 DEV-2000 Dark mode' })).toBeTruthy();
		await type(screen.getByLabelText('New ticket'), 'TL-1 Again');
		await fireEvent.keyDown(screen.getByLabelText('New ticket'), { key: 'Enter' });
		expect(await screen.findByRole('article', { name: 'TL-121 TL-1 Again' })).toBeTruthy();
	});

	it('explains a refusal and keeps what was typed', async () => {
		await openBoard();
		const tooLong = 'x'.repeat(33);
		const line = await openNewLine(tooLong);
		await fireEvent.keyDown(line, { key: 'Enter' });
		expect((await screen.findByRole('alert')).textContent).toContain('That is too long');
		expect(input(screen.getByLabelText('New ticket')).value).toBe(tooLong);
		await fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
		expect(screen.queryByRole('alert')).toBeNull();
	});

	it('closes the line on Escape without adding, and adds what was typed when it is left', async () => {
		await openBoard();
		const line = await openNewLine('Never added');
		await fireEvent.keyDown(line, { key: 'Escape' });
		expect(screen.queryByLabelText('New ticket')).toBeNull();
		expect(screen.queryByRole('article', { name: /Never added/ })).toBeNull();
		const again = await openNewLine('Added on leaving');
		await fireEvent.blur(again);
		expect(await screen.findByRole('article', { name: 'TL-120 Added on leaving' })).toBeTruthy();
		await vi.waitFor(() => expect(screen.queryByLabelText('New ticket')).toBeNull());
	});
});

describe('editing a ticket', () => {
	it('renames it and changes its dates, kept after a reload', async () => {
		await openBoard();
		await fireEvent.click(card(/^TL-17 /).getByRole('button', { name: 'Edit TL-17' }));
		const editor = within(screen.getByRole('form', { name: 'Edit TL-17' }));
		await type(editor.getByLabelText('Name'), 'Disk alerts');
		await type(editor.getByLabelText('Start'), '2026-11-10');
		await type(editor.getByLabelText('Due'), '2026-11-12');
		await fireEvent.click(editor.getByRole('button', { name: 'Save' }));
		expect(await screen.findByRole('article', { name: 'TL-17 Disk alerts' })).toBeTruthy();
		await reload();
		expect(card(/^TL-17 /).getByText('10/11/2026 to 12/11/2026')).toBeTruthy();
	});

	it('clears the dates when both are emptied', async () => {
		await openBoard();
		await fireEvent.click(card(/^TL-1 /).getByRole('button', { name: 'Edit TL-1' }));
		const editor = within(screen.getByRole('form', { name: 'Edit TL-1' }));
		await type(editor.getByLabelText('Start'), '');
		await type(editor.getByLabelText('Due'), '');
		await fireEvent.click(editor.getByRole('button', { name: 'Save' }));
		await vi.waitFor(() => expect(card(/^TL-1 /).queryByText(/ to /)).toBeNull());
		await reload();
		expect(card(/^TL-1 /).queryByText(/ to /)).toBeNull();
	});

	it('keeps the editor open and asks for both dates when only one is left', async () => {
		await openBoard();
		await fireEvent.click(card(/^TL-1 /).getByRole('button', { name: 'Edit TL-1' }));
		const editor = within(screen.getByRole('form', { name: 'Edit TL-1' }));
		await type(editor.getByLabelText('Due'), '');
		await fireEvent.click(editor.getByRole('button', { name: 'Save' }));
		expect(editor.getByRole('alert').textContent).toContain('Give both dates, or neither.');
		await reload();
		// The seed's dates follow today, so any range will do.
		expect(card(/^TL-1 /).getByText(/^\d{2}\/\d{2}\/\d{4} to \d{2}\/\d{2}\/\d{4}$/)).toBeTruthy();
	});

	it('saves when the fields are submitted, with nothing to click', async () => {
		await openBoard();
		await fireEvent.click(card(/^TL-17 /).getByRole('button', { name: 'Edit TL-17' }));
		const editor = within(screen.getByRole('form', { name: 'Edit TL-17' }));
		const name = editor.getByLabelText('Name');
		expect(document.activeElement).toBe(name);
		await type(name, 'Disk alerts');
		await fireEvent.submit(screen.getByRole('form', { name: 'Edit TL-17' }));
		expect(await screen.findByRole('article', { name: 'TL-17 Disk alerts' })).toBeTruthy();
		expect(screen.queryByRole('form', { name: 'Edit TL-17' })).toBeNull();
	});

	it('saves when the fields are left, but not when moving between them', async () => {
		await openBoard();
		await fireEvent.click(card(/^TL-17 /).getByRole('button', { name: 'Edit TL-17' }));
		const form = screen.getByRole('form', { name: 'Edit TL-17' });
		const name = within(form).getByLabelText('Name');
		await type(name, 'Left behind');
		await fireEvent.focusOut(name, { relatedTarget: within(form).getByLabelText('Start') });
		expect(screen.getByRole('form', { name: 'Edit TL-17' })).toBeTruthy();
		await fireEvent.focusOut(name, { relatedTarget: document.body });
		expect(await screen.findByRole('article', { name: 'TL-17 Left behind' })).toBeTruthy();
	});

	it('asks for both dates when one is left alone and the fields are left', async () => {
		await openBoard();
		await fireEvent.click(card(/^TL-1 /).getByRole('button', { name: 'Edit TL-1' }));
		const form = screen.getByRole('form', { name: 'Edit TL-1' });
		await type(within(form).getByLabelText('Due'), '');
		await fireEvent.focusOut(within(form).getByLabelText('Due'), { relatedTarget: document.body });
		expect(within(form).getByRole('alert').textContent).toContain('Give both dates, or neither.');
		expect(screen.getByRole('form', { name: 'Edit TL-1' })).toBeTruthy();
	});

	it("doesn't save when focus goes to another window", async () => {
		await openBoard();
		await fireEvent.click(card(/^TL-17 /).getByRole('button', { name: 'Edit TL-17' }));
		const name = within(screen.getByRole('form', { name: 'Edit TL-17' })).getByLabelText('Name');
		await type(name, 'Half typed');
		vi.spyOn(document, 'hasFocus').mockReturnValue(false);
		await fireEvent.focusOut(name, { relatedTarget: null });
		expect(screen.getByRole('form', { name: 'Edit TL-17' })).toBeTruthy();
		expect(screen.queryByRole('article', { name: /Half typed/ })).toBeNull();
	});

	it('keeps focus in the fields when the × is pressed, and undoes on Escape from it', async () => {
		await openBoard();
		await fireEvent.click(card(/^TL-1 /).getByRole('button', { name: 'Edit TL-1' }));
		const form = screen.getByRole('form', { name: 'Edit TL-1' });
		const clear = within(form).getByRole('button', { name: 'Clear the dates' });
		const pressed = await fireEvent.pointerDown(clear, { button: 0, isPrimary: true });
		expect(pressed).toBe(false);
		await fireEvent.keyDown(clear, { key: 'Escape' });
		expect(screen.queryByRole('form', { name: 'Edit TL-1' })).toBeNull();
	});

	it('undoes on Escape', async () => {
		await openBoard();
		await fireEvent.click(card(/^TL-17 /).getByRole('button', { name: 'Edit TL-17' }));
		const name = within(screen.getByRole('form', { name: 'Edit TL-17' })).getByLabelText('Name');
		await type(name, 'Thrown away');
		await fireEvent.keyDown(name, { key: 'Escape' });
		expect(screen.queryByRole('form', { name: 'Edit TL-17' })).toBeNull();
		expect(screen.getByRole('article', { name: 'TL-17 Disk space alert' })).toBeTruthy();
	});

	it('clears both dates with its ×', async () => {
		await openBoard();
		await fireEvent.click(card(/^TL-1 /).getByRole('button', { name: 'Edit TL-1' }));
		const form = screen.getByRole('form', { name: 'Edit TL-1' });
		await fireEvent.click(within(form).getByRole('button', { name: 'Clear the dates' }));
		await fireEvent.submit(form);
		await vi.waitFor(() => expect(card(/^TL-1 /).queryByText(/ to /)).toBeNull());
	});

	it('keeps the editor open with a message when the name is blank', async () => {
		await openBoard();
		await fireEvent.click(card(/^TL-17 /).getByRole('button', { name: 'Edit TL-17' }));
		const editor = within(screen.getByRole('form', { name: 'Edit TL-17' }));
		await type(editor.getByLabelText('Name'), '   ');
		await fireEvent.click(editor.getByRole('button', { name: 'Save' }));
		expect((await screen.findByRole('alert')).textContent).toContain("can't be blank");
		expect(screen.getByRole('form', { name: 'Edit TL-17' })).toBeTruthy();
	});
});

describe("a card's sub-tickets", () => {
	it('shows only how many are in each stage, and opens the ticket to show them', async () => {
		await openBoard();
		expect(
			card(/^TL-1 /).getByRole('progressbar', {
				name: '2 done, 1 in progress, 1 to do, 1 in backlog'
			})
		).toBeTruthy();
		expect(card(/^TL-1 /).queryByText('Run integration tests')).toBeNull();
		await fireEvent.click(card(/^TL-1 /).getByRole('button', { name: 'Login page' }));
		expect(location.hash).toBe('#TL-1');
	});
});

describe('removing a ticket', () => {
	it('removes one with no sub-tickets from its trash icon, kept after a reload', async () => {
		await openBoard();
		await fireEvent.click(card(/^TL-17 /).getByRole('button', { name: 'Remove TL-17' }));
		await vi.waitFor(() => expect(screen.queryByRole('article', { name: /^TL-17 / })).toBeNull());
		await reload();
		expect(screen.queryByRole('article', { name: /^TL-17 / })).toBeNull();
	});

	it('refuses one that has sub-tickets, and says why', async () => {
		await openBoard();
		await fireEvent.click(card(/^TL-1 /).getByRole('button', { name: 'Remove TL-1' }));
		expect((await screen.findByRole('alert')).textContent).toContain(
			'That ticket still has sub-tickets'
		);
		expect(screen.getByRole('article', { name: /^TL-1 / })).toBeTruthy();
	});
});

describe('carrying cards', () => {
	// jsdom has no layout, so each test gives the board one: four columns side
	// by side, cards stacked down each column.
	const columnOrder = ['backlog', 'todo', 'in_progress', 'done'];
	const cardGap = 220;
	const cardHeight = 200;

	function box(left: number, top: number, width: number, height: number): DOMRect {
		return DOMRect.fromRect({ x: left, y: top, width, height });
	}

	function positionIn(element: Element): number {
		return element.parentElement === null
			? 0
			: [...element.parentElement.children].indexOf(element);
	}

	function layout(element: Element): DOMRect {
		const columnElement = element.closest('[data-column]');
		const column = columnOrder.indexOf(columnElement?.getAttribute('data-column') ?? '');
		const left = column * 300;
		if (element.matches('[data-column]')) return box(left, 0, 290, 2000);
		const cardRow = element.closest('[data-ticket]');
		if (cardRow === null) return box(0, 0, 0, 0);
		const cardTop = 100 + positionIn(cardRow) * cardGap;
		if (element === cardRow || element.matches('article'))
			return box(left + 10, cardTop, 270, cardHeight);
		return box(0, 0, 0, 0);
	}

	function useLayout(): void {
		vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
			this: Element
		) {
			return layout(this);
		});
	}

	async function press(element: Element, x: number, y: number) {
		await fireEvent.pointerDown(element, { button: 0, isPrimary: true, clientX: x, clientY: y });
	}

	async function moveTo(x: number, y: number) {
		window.dispatchEvent(
			new PointerEvent('pointermove', { clientX: x, clientY: y, isPrimary: true })
		);
		await tick();
	}

	async function release() {
		window.dispatchEvent(new PointerEvent('pointerup', { isPrimary: true }));
		await tick();
	}

	it('lifts a card out of its column and opens a gap where it would land', async () => {
		await openBoard();
		useLayout();
		await press(screen.getByRole('heading', { name: 'Search index' }), 400, 150);
		await moveTo(400, 160);
		expect(columnIds('To do')).not.toContain('TL-8');
		expect(column('To do').getByText('Drop here')).toBeTruthy();
		await moveTo(1000, 50);
		expect(column('Done').getByText('Drop here')).toBeTruthy();
		expect(column('To do').queryByText('Drop here')).toBeNull();
		await release();
		await vi.waitFor(() => expect(columnIds('Done')).toEqual(['TL-8', 'TL-18']));
		expect(screen.queryByText('Drop here')).toBeNull();
		await reload();
		expect(columnIds('Done')).toEqual(['TL-8', 'TL-18']);
	});

	it('puts a card back when it is dropped outside the columns, or on Escape', async () => {
		await openBoard();
		useLayout();
		await press(screen.getByRole('heading', { name: 'Search index' }), 400, 150);
		await moveTo(400, 160);
		await moveTo(5000, 50);
		expect(screen.queryByText('Drop here')).toBeNull();
		await release();
		expect(columnIds('To do')[0]).toBe('TL-8');
		await press(screen.getByRole('heading', { name: 'Search index' }), 400, 150);
		await moveTo(1000, 50);
		await fireEvent.keyDown(window, { key: 'Escape' });
		await release();
		await reload();
		expect(columnIds('To do')[0]).toBe('TL-8');
		expect(columnIds('Done')).toEqual(['TL-18']);
	});

	it('treats a press that barely moves as a click, not a lift', async () => {
		await openBoard();
		useLayout();
		await press(screen.getByRole('heading', { name: 'Search index' }), 400, 150);
		await moveTo(402, 152);
		expect(screen.queryByText('Drop here')).toBeNull();
		await release();
	});

	// Whether a card reads out as selected.
	function isSelected(id: string): boolean {
		return (
			screen
				.getByRole('article', { name: new RegExp(`^${id} `) })
				.getAttribute('aria-label')
				?.endsWith(', selected') ?? false
		);
	}

	// The empty part of a column, where a press draws a selection box.
	function columnSpace(name: string): HTMLElement {
		return screen.getByRole('region', { name });
	}

	it('selects every card a box drawn on empty space touches, and a click there clears it', async () => {
		await openBoard();
		useLayout();
		// To do spans 300 to 590 across; its first two cards sit at 100 to 300 and 320 to 520.
		await press(columnSpace('To do'), 305, 90);
		await moveTo(450, 200);
		await moveTo(590, 330);
		expect(isSelected('TL-8')).toBe(true);
		expect(isSelected('TL-11')).toBe(true);
		expect(isSelected('TL-17')).toBe(false);
		await release();
		expect(isSelected('TL-8')).toBe(true);
		await press(columnSpace('To do'), 305, 1500);
		await release();
		expect(isSelected('TL-8')).toBe(false);
	});

	it('adds to the selection when Shift is held, and a Shift-click on empty space keeps it', async () => {
		await openBoard();
		useLayout();
		await press(columnSpace('To do'), 305, 90);
		await moveTo(590, 200);
		await release();
		const shifted = { button: 0, isPrimary: true, clientX: 305, clientY: 330, shiftKey: true };
		await fireEvent.pointerDown(columnSpace('To do'), shifted);
		await moveTo(590, 450);
		await release();
		expect(isSelected('TL-8')).toBe(true);
		expect(isSelected('TL-11')).toBe(true);
		await fireEvent.pointerDown(columnSpace('To do'), { ...shifted, clientY: 1500 });
		await release();
		expect(isSelected('TL-8')).toBe(true);
	});

	it('puts the selection back when Escape gives up on a box', async () => {
		await openBoard();
		useLayout();
		await fireEvent.keyDown(screen.getByRole('button', { name: 'Move TL-17' }), { key: ' ' });
		await press(columnSpace('To do'), 305, 90);
		await moveTo(590, 200);
		expect(isSelected('TL-17')).toBe(false);
		await fireEvent.keyDown(window, { key: 'Escape' });
		await release();
		expect(isSelected('TL-17')).toBe(true);
		expect(isSelected('TL-8')).toBe(false);
	});

	it('carries every selected card together and drops them in board order', async () => {
		await openBoard();
		useLayout();
		await fireEvent.keyDown(screen.getByRole('button', { name: 'Move TL-8' }), { key: ' ' });
		await fireEvent.keyDown(screen.getByRole('button', { name: 'Move TL-17' }), { key: ' ' });
		await press(screen.getByRole('heading', { name: 'Disk space alert' }), 400, 590);
		await moveTo(400, 600);
		expect(columnIds('To do')).toEqual(['TL-11', 'TL-24']);
		await moveTo(1000, 50);
		await release();
		await vi.waitFor(() => expect(columnIds('Done')).toEqual(['TL-8', 'TL-17', 'TL-18']));
		await reload();
		expect(columnIds('Done')).toEqual(['TL-8', 'TL-17', 'TL-18']);
	});

	it('keeps the selection when Escape puts a carried group back', async () => {
		await openBoard();
		useLayout();
		await fireEvent.keyDown(screen.getByRole('button', { name: 'Move TL-8' }), { key: ' ' });
		await fireEvent.keyDown(screen.getByRole('button', { name: 'Move TL-11' }), { key: ' ' });
		await press(screen.getByRole('heading', { name: 'Search index' }), 400, 150);
		await moveTo(400, 160);
		await moveTo(1000, 50);
		await fireEvent.keyDown(window, { key: 'Escape' });
		await release();
		expect(columnIds('To do').slice(0, 2)).toEqual(['TL-8', 'TL-11']);
		expect(isSelected('TL-8')).toBe(true);
		expect(isSelected('TL-11')).toBe(true);
	});

	it('drops a group from two columns in the order they are seen, into the middle of one of them', async () => {
		await openBoard();
		useLayout();
		// TL-1 is first in In progress, TL-17 third in To do; seen order is To do first.
		await fireEvent.keyDown(screen.getByRole('button', { name: 'Move TL-1' }), { key: ' ' });
		await fireEvent.keyDown(screen.getByRole('button', { name: 'Move TL-17' }), { key: ' ' });
		await press(screen.getByRole('heading', { name: 'Login page' }), 700, 150);
		await moveTo(700, 160);
		// Into To do, between TL-8 (middle 200) and TL-11 (middle 420).
		await moveTo(400, 300);
		await release();
		await vi.waitFor(() =>
			expect(columnIds('To do')).toEqual(['TL-8', 'TL-17', 'TL-1', 'TL-11', 'TL-24'])
		);
		expect(columnIds('In progress')).toEqual(['TL-13']);
	});

	it('stops moving a group at the first refused move', async () => {
		await openBoard();
		useLayout();
		await fireEvent.keyDown(screen.getByRole('button', { name: 'Move TL-8' }), { key: ' ' });
		await fireEvent.keyDown(screen.getByRole('button', { name: 'Move TL-11' }), { key: ' ' });
		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new Error('storage full');
		});
		vi.spyOn(console, 'error').mockImplementation(() => {});
		await press(screen.getByRole('heading', { name: 'Search index' }), 400, 150);
		await moveTo(400, 160);
		await moveTo(1000, 50);
		await release();
		expect((await screen.findByRole('alert')).textContent).toContain('Something went wrong');
		expect(columnIds('To do').slice(0, 2)).toEqual(['TL-8', 'TL-11']);
		expect(columnIds('Done')).toEqual(['TL-18']);
	});
});

describe('selecting with the keyboard and clicks', () => {
	function isSelected(id: string): boolean {
		return (
			screen
				.getByRole('article', { name: new RegExp(`^${id} `) })
				.getAttribute('aria-label')
				?.endsWith(', selected') ?? false
		);
	}

	it('adds a card with Space on its ID or Cmd-click, takes it out again, and Escape clears', async () => {
		await openBoard();
		const grip = screen.getByRole('button', { name: 'Move TL-8' });
		await fireEvent.keyDown(grip, { key: ' ' });
		expect(isSelected('TL-8')).toBe(true);
		await fireEvent.keyDown(grip, { key: ' ' });
		expect(isSelected('TL-8')).toBe(false);
		await fireEvent.click(screen.getByRole('button', { name: 'Search index' }), {
			metaKey: true
		});
		expect(isSelected('TL-8')).toBe(true);
		expect(location.hash).toBe('');
		await fireEvent.keyDown(window, { key: 'Escape' });
		expect(isSelected('TL-8')).toBe(false);
	});

	it('selects with a Cmd-click on the trash icon instead of removing the ticket', async () => {
		await openBoard();
		await fireEvent.click(screen.getByRole('button', { name: 'Remove TL-17' }), {
			ctrlKey: true
		});
		expect(isSelected('TL-17')).toBe(true);
		await reload();
		expect(screen.getByRole('article', { name: /^TL-17 / })).toBeTruthy();
	});

	it('moves every selected card to the next stage with Alt and Right on one of them', async () => {
		await openBoard();
		await fireEvent.keyDown(screen.getByRole('button', { name: 'Move TL-8' }), { key: ' ' });
		await fireEvent.keyDown(screen.getByRole('button', { name: 'Move TL-11' }), { key: ' ' });
		await fireEvent.keyDown(screen.getByRole('button', { name: 'Move TL-11' }), {
			key: 'ArrowRight',
			altKey: true
		});
		await vi.waitFor(() =>
			expect(columnIds('In progress')).toEqual(['TL-1', 'TL-13', 'TL-8', 'TL-11'])
		);
		expect(columnIds('To do')).toEqual(['TL-17', 'TL-24']);
	});
});

describe('moving with the keyboard', () => {
	it('moves a card up, down and across columns with Alt and the arrow keys, keeping focus', async () => {
		await openBoard();
		const grip = screen.getByRole('button', { name: 'Move TL-11' });
		grip.focus();
		await fireEvent.keyDown(grip, { key: 'ArrowUp', altKey: true });
		await vi.waitFor(() => expect(columnIds('To do')[0]).toBe('TL-11'));
		expect(document.activeElement?.getAttribute('aria-label')).toBe('Move TL-11');
		await fireEvent.keyDown(screen.getByRole('button', { name: 'Move TL-11' }), {
			key: 'ArrowRight',
			altKey: true
		});
		await vi.waitFor(() => expect(columnIds('In progress').at(-1)).toBe('TL-11'));
		// With no motion in tests the row it left is already gone; the browser
		// check covers focus while that row is still fading out.
		expect(column('In progress').getByRole('button', { name: 'Move TL-11' })).toBe(
			document.activeElement
		);
		await reload();
		expect(columnIds('In progress')).toEqual(['TL-1', 'TL-13', 'TL-11']);
	});
});

describe('refusals and repeats', () => {
	it('keeps a card where it was when a move is refused', async () => {
		await openBoard();
		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new Error('storage full');
		});
		vi.spyOn(console, 'error').mockImplementation(() => {});
		await fireEvent.keyDown(screen.getByRole('button', { name: 'Move TL-11' }), {
			key: 'ArrowRight',
			altKey: true
		});
		expect((await screen.findByRole('alert')).textContent).toContain('Something went wrong');
		expect(columnIds('To do')).toContain('TL-11');
	});

	it('creates a ticket once when Enter is pressed twice quickly', async () => {
		await openBoard();
		const line = await openNewLine('Only once');
		void fireEvent.keyDown(line, { key: 'Enter' });
		await fireEvent.keyDown(line, { key: 'Enter' });
		await vi.waitFor(() =>
			expect(screen.getByRole('article', { name: 'TL-120 Only once' })).toBeTruthy()
		);
		expect(screen.queryByRole('article', { name: 'TL-121 Only once' })).toBeNull();
		expect(screen.queryByRole('alert')).toBeNull();
	});

	it('saves a ticket edit once when the editor is submitted twice quickly', async () => {
		await openBoard();
		await fireEvent.click(card(/^TL-17 /).getByRole('button', { name: 'Edit TL-17' }));
		const form = screen.getByRole('form', { name: 'Edit TL-17' });
		await type(within(form).getByLabelText('Name'), 'Saved once');
		const saves = vi.spyOn(Storage.prototype, 'setItem');
		void fireEvent.submit(form);
		await fireEvent.submit(form);
		await screen.findByRole('article', { name: 'TL-17 Saved once' });
		expect(saves).toHaveBeenCalledOnce();
	});
});
