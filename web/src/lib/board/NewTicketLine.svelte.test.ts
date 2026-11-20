// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import type { Edit } from './edits';
import NewTicketLine from './NewTicketLine.svelte';

function field(): HTMLInputElement {
	const found = screen.getByLabelText('New ticket');
	if (!(found instanceof HTMLInputElement)) throw new Error('expected an input');
	return found;
}

describe('NewTicketLine', () => {
	it('keeps what is typed while the ticket before it is still being added', async () => {
		const sent: Edit[] = [];
		let finish: (added: boolean) => void = () => {};
		const onEdit = (edit: Edit) => {
			sent.push(edit);
			return new Promise<boolean>((resolve) => (finish = resolve));
		};
		render(NewTicketLine, { parent: null, onEdit });
		await fireEvent.click(screen.getByRole('button', { name: '+ New ticket' }));
		await fireEvent.input(field(), { target: { value: 'First' } });
		await fireEvent.keyDown(field(), { key: 'Enter' });
		await fireEvent.input(field(), { target: { value: 'Second, typed meanwhile' } });
		finish(true);
		await new Promise((resolve) => setTimeout(resolve));
		expect(field().value).toBe('Second, typed meanwhile');
		expect(sent).toEqual([{ kind: 'createTicket', name: 'First', schedule: null, parent: null }]);
	});

	it('clears the line once the ticket is added when nothing more was typed', async () => {
		render(NewTicketLine, { parent: 'TL-1', onEdit: async () => true });
		await fireEvent.click(screen.getByRole('button', { name: '+ New ticket' }));
		await fireEvent.input(field(), { target: { value: 'Child' } });
		await fireEvent.keyDown(field(), { key: 'Enter' });
		await new Promise((resolve) => setTimeout(resolve));
		expect(field().value).toBe('');
	});

	it('keeps the text and stays open when the ticket is refused', async () => {
		render(NewTicketLine, { parent: null, onEdit: async () => false });
		await fireEvent.click(screen.getByRole('button', { name: '+ New ticket' }));
		await fireEvent.input(field(), { target: { value: 'Refused' } });
		await fireEvent.keyDown(field(), { key: 'Enter' });
		await new Promise((resolve) => setTimeout(resolve));
		expect(field().value).toBe('Refused');
	});
});
