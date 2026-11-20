// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import { seedTickets } from '../seed';
import Board from './Board.svelte';

const today = '2026-11-03';

function renderBoard() {
	render(Board, {
		tickets: seedTickets(today),
		parent: null,
		today,
		onEdit: async () => true,
		onOpen: () => {}
	});
}

function card(name: RegExp) {
	return within(screen.getByRole('article', { name }));
}

describe('Board', () => {
	it('shows the four columns in order, each with its ticket count', () => {
		renderBoard();
		const headings = screen
			.getAllByRole('heading', { level: 2 })
			.map((heading) => heading.textContent);
		expect(headings).toEqual(['Backlog', 'To do', 'In progress', 'Done']);
		expect(
			within(screen.getByRole('region', { name: 'Backlog' })).getByText('1 ticket')
		).toBeTruthy();
		expect(
			within(screen.getByRole('region', { name: 'To do' })).getByText('4 tickets')
		).toBeTruthy();
		expect(
			within(screen.getByRole('region', { name: 'In progress' })).getByText('2 tickets')
		).toBeTruthy();
		expect(within(screen.getByRole('region', { name: 'Done' })).getByText('1 ticket')).toBeTruthy();
	});

	it('puts each top-level ticket in its own column, in seed order, and no sub-tickets', () => {
		renderBoard();
		const names = (column: string) =>
			within(screen.getByRole('region', { name: column }))
				.getAllByRole('article')
				.map((article) => article.getAttribute('aria-label'));
		expect(names('To do')).toEqual([
			'TL-8 Search index',
			'TL-11 Export to CSV',
			'TL-17 Disk space alert',
			`TL-24 ${'é'.repeat(32)}`
		]);
		expect(names('In progress')).toEqual(['TL-1 Login page', 'TL-13 Fix session timeout']);
		expect(names('Done')).toEqual(['TL-18 Monthly usage report']);
		expect(names('Backlog')).toEqual(['TL-21 Email reminders']);
	});

	it("shows a ticket's sub-tickets when the board is under it", () => {
		render(Board, {
			tickets: seedTickets(today),
			parent: 'TL-4',
			today,
			onEdit: async () => true,
			onOpen: () => {}
		});
		expect(
			screen.getAllByRole('article').map((article) => article.getAttribute('aria-label'))
		).toEqual(['TL-6 Unit tests', 'TL-5 Write the handler']);
	});

	it('shows dates as DD/MM/YYYY', () => {
		renderBoard();
		expect(card(/^TL-1 /).getByText('27/10/2026 to 11/11/2026')).toBeTruthy();
	});

	it('marks only the overdue ticket, not the one due today or the one in Done', () => {
		renderBoard();
		expect(card(/^TL-11 /).getByText('Overdue')).toBeTruthy();
		expect(card(/^TL-13 /).queryByText('Overdue')).toBeNull();
		expect(card(/^TL-18 /).queryByText('Overdue')).toBeNull();
		expect(screen.getAllByText('Overdue')).toHaveLength(1);
	});

	it('shows only the ID and name of a ticket with no schedule and no sub-tickets', () => {
		renderBoard();
		const unscheduled = card(/^TL-17 /);
		expect(unscheduled.queryByText(/scheduled|to /)).toBeNull();
		expect(unscheduled.queryByRole('progressbar')).toBeNull();
		expect(unscheduled.getByRole('button', { name: 'Disk space alert' })).toBeTruthy();
	});

	it('shows progress for a ticket with every sub-ticket done', () => {
		renderBoard();
		const progress = card(/^TL-18 /).getByRole('progressbar', { name: '2 done' });
		expect(progress.getAttribute('title')).toBe('2 done');
		expect(progress.getAttribute('aria-valuetext')).toBe('2 done');
		expect(progress.getAttribute('aria-valuenow')).toBe('2');
		expect(progress.getAttribute('aria-valuemax')).toBe('2');
	});

	it('counts the sub-tickets in each stage, Done first, leaving out stages with none', () => {
		renderBoard();
		const counts = '2 done, 1 in progress, 1 to do, 1 in backlog';
		const progress = card(/^TL-1 /).getByRole('progressbar', { name: counts });
		expect(progress.getAttribute('title')).toBe(counts);
		expect(progress.getAttribute('aria-valuetext')).toBe(counts);
		expect(progress.getAttribute('aria-valuenow')).toBe('2');
		expect(progress.getAttribute('aria-valuemax')).toBe('5');
		const reminders = card(/^TL-21 /).getByRole('progressbar', { name: '1 to do, 1 in backlog' });
		expect(reminders.getAttribute('aria-valuenow')).toBe('0');
	});

	it('shows the ticket at every limit in full', () => {
		renderBoard();
		const limit = card(/^TL-24 /);
		expect(limit.getByRole('heading', { level: 3 }).textContent).toBe('é'.repeat(32));
		expect(limit.getByRole('progressbar', { name: '64 to do' })).toBeTruthy();
	});
});
