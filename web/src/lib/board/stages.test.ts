import { describe, expect, it } from 'vitest';
import type { Column, Ticket } from '../types';
import { countsText, stageCounts } from './stages';

function ticket(id: string, column: Column): Ticket {
	return { id, name: id, column, schedule: null, parent: null, description: '' };
}

describe('stageCounts', () => {
	it('gives nothing for no tickets', () => {
		expect(stageCounts([])).toEqual([]);
	});

	it('counts each stage, Done first and Backlog last, whatever order the tickets come in', () => {
		const tickets = [
			ticket('TL-1', 'backlog'),
			ticket('TL-2', 'todo'),
			ticket('TL-3', 'done'),
			ticket('TL-4', 'in_progress'),
			ticket('TL-5', 'done')
		];
		expect(stageCounts(tickets)).toEqual([
			{ stage: 'done', count: 2 },
			{ stage: 'in_progress', count: 1 },
			{ stage: 'todo', count: 1 },
			{ stage: 'backlog', count: 1 }
		]);
	});

	it('leaves out the stages with none', () => {
		expect(stageCounts([ticket('TL-1', 'todo')])).toEqual([{ stage: 'todo', count: 1 }]);
	});
});

describe('countsText', () => {
	it('says each count in words, in the order given', () => {
		expect(
			countsText([
				{ stage: 'done', count: 2 },
				{ stage: 'in_progress', count: 1 },
				{ stage: 'todo', count: 1 },
				{ stage: 'backlog', count: 3 }
			])
		).toBe('2 done, 1 in progress, 1 to do, 3 in backlog');
	});

	it('says nothing for no counts', () => {
		expect(countsText([])).toBe('');
	});
});
