// @vitest-environment jsdom
import { render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Api } from '../lib/api';
import { createFakeApi, storageKey } from '../lib/fake-api';
import LayoutWithPage from './LayoutWithPage.test.svelte';
import PageWithApi from './PageWithApi.test.svelte';

afterEach(() => {
	localStorage.clear();
	vi.restoreAllMocks();
});

describe('the board page', () => {
	it('loads the seed tickets through the Api on the first visit, and saves them', async () => {
		render(LayoutWithPage);
		expect(await screen.findByRole('article', { name: /^TL-1 / })).toBeTruthy();
		expect(localStorage.getItem(storageKey)).not.toBeNull();
	});

	it('shows the saved board on a later visit', async () => {
		const board = {
			tickets: [
				{ id: 'TL-7', name: 'Saved earlier', column: 'done', schedule: null, parent: null }
			],
			generatedNumberNext: 8
		};
		localStorage.setItem(storageKey, JSON.stringify(board));
		render(LayoutWithPage);
		expect(await screen.findByRole('article', { name: 'TL-7 Saved earlier' })).toBeTruthy();
		expect(screen.queryByRole('article', { name: /^TL-1 / })).toBeNull();
	});

	it('starts with the seed board when only a board with typed IDs is saved, and leaves that board alone', async () => {
		// Boards saved with typed DEV- IDs were kept under this key.
		const boardBefore = JSON.stringify({
			tickets: [{ id: 'DEV-1234', name: 'Typed', column: 'todo', schedule: null, parent: null }],
			generatedNumberNext: 1
		});
		localStorage.setItem('ticket-board', boardBefore);
		render(LayoutWithPage);
		expect(await screen.findByRole('article', { name: 'TL-1 Login page' })).toBeTruthy();
		expect(screen.queryByRole('alert')).toBeNull();
		expect(localStorage.getItem('ticket-board')).toBe(boardBefore);
	});

	it('says the saved board is unreadable, logs why and keeps it', () => {
		const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
		localStorage.setItem(storageKey, 'not json');
		render(LayoutWithPage);
		expect(screen.getByRole('alert').textContent).toContain("can't be read");
		expect(logged).toHaveBeenCalledOnce();
		expect(localStorage.getItem(storageKey)).toBe('not json');
	});

	it('says something went wrong, and logs why, when browser storage fails', () => {
		const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new Error('storage full');
		});
		render(LayoutWithPage);
		expect(screen.getByRole('alert').textContent).toContain(
			'Something went wrong opening the board'
		);
		expect(logged).toHaveBeenCalledOnce();
	});

	it('says something went wrong, and logs why, when loading the comments fails', async () => {
		const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
		const working = createFakeApi(localStorage, '2026-11-03', () => new Date());
		const api: Api = {
			...working,
			listComments: () => Promise.reject(new Error('server down'))
		};
		render(PageWithApi, { api });
		expect((await screen.findByRole('alert')).textContent).toContain(
			'Something went wrong loading the board'
		);
		expect(logged).toHaveBeenCalledOnce();
	});

	it('says something went wrong, and logs why, when loading the tickets fails', async () => {
		const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
		const working = createFakeApi(localStorage, '2026-11-03', () => new Date());
		const api: Api = {
			...working,
			listTickets: () => Promise.reject(new Error('server down'))
		};
		render(PageWithApi, { api });
		expect((await screen.findByRole('alert')).textContent).toContain(
			'Something went wrong loading the board'
		);
		expect(logged).toHaveBeenCalledOnce();
	});
});
