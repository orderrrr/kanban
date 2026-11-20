import { describe, expect, it } from 'vitest';
import { childrenOf, familyOf, inStageOrder, placeAt, trailTo } from './tickets';
import type { Column, Ticket } from './types';
import { depthMax } from './types';

function ticket(id: string, column: Column, parent: string | null): Ticket {
	return { id, name: `Name of ${id}`, column, schedule: null, parent, description: '' };
}

function ids(tickets: Ticket[]): string[] {
	return tickets.map((each) => each.id);
}

// Two top-level tickets; TL-11 has sub-tickets in two stages, one with its own.
const board: Ticket[] = [
	ticket('TL-11', 'todo', null),
	ticket('TL-1', 'done', 'TL-11'),
	ticket('TL-2', 'todo', 'TL-11'),
	ticket('TL-12', 'todo', null),
	ticket('TL-3', 'todo', 'TL-11'),
	ticket('TL-4', 'backlog', 'TL-2')
];

describe('childrenOf', () => {
	it('gives the top-level tickets for null, in board order', () => {
		expect(ids(childrenOf(board, null))).toEqual(['TL-11', 'TL-12']);
	});

	it('gives only the tickets directly under a parent, not deeper ones', () => {
		expect(ids(childrenOf(board, 'TL-11'))).toEqual(['TL-1', 'TL-2', 'TL-3']);
	});

	it('gives none for a ticket without sub-tickets or not on the board', () => {
		expect(childrenOf(board, 'TL-4')).toEqual([]);
		expect(childrenOf(board, 'TL-99')).toEqual([]);
	});
});

describe('inStageOrder', () => {
	it('puts Backlog first and Done last, keeping board order within a stage', () => {
		const tickets = [
			ticket('TL-1', 'done', null),
			ticket('TL-2', 'todo', null),
			ticket('TL-3', 'backlog', null),
			ticket('TL-4', 'in_progress', null),
			ticket('TL-5', 'todo', null)
		];
		expect(ids(inStageOrder(tickets))).toEqual(['TL-3', 'TL-2', 'TL-5', 'TL-4', 'TL-1']);
	});

	it('gives none for none', () => {
		expect(inStageOrder([])).toEqual([]);
	});
});

describe('trailTo', () => {
	it('gives just the ticket for a top-level one', () => {
		expect(ids(trailTo(board, 'TL-12'))).toEqual(['TL-12']);
	});

	it('gives the trail from the top level down to a deep ticket', () => {
		expect(ids(trailTo(board, 'TL-4'))).toEqual(['TL-11', 'TL-2', 'TL-4']);
	});

	it('is empty for an ID not on the board', () => {
		expect(trailTo(board, 'TL-99')).toEqual([]);
	});

	it('stops at depthMax on a chain that loops', () => {
		const loop = [ticket('TL-1', 'todo', 'TL-2'), ticket('TL-2', 'todo', 'TL-1')];
		expect(trailTo(loop, 'TL-1')).toHaveLength(depthMax);
	});

	it('reaches the top through exactly depthMax levels', () => {
		const chain = Array.from({ length: depthMax }, (_unused, level) =>
			ticket(`TL-${level + 1}`, 'todo', level === 0 ? null : `TL-${level}`)
		);
		const trail = trailTo(chain, `TL-${depthMax}`);
		expect(trail).toHaveLength(depthMax);
		expect(trail[0]?.parent).toBeNull();
	});
});

describe('placeAt', () => {
	const tickets = [
		ticket('TL-1', 'todo', null),
		ticket('TL-2', 'todo', null),
		ticket('TL-3', 'todo', null),
		ticket('TL-4', 'done', null)
	];

	function columnIds(placed: Ticket[], column: Column): string[] {
		return ids(placed.filter((each) => each.column === column));
	}

	it('reorders within a column, counting as if the ticket were already taken out', () => {
		const first = tickets[0]!;
		expect(columnIds(placeAt(tickets, first, 'todo', 1), 'todo')).toEqual(['TL-2', 'TL-1', 'TL-3']);
		expect(columnIds(placeAt(tickets, tickets[2]!, 'todo', 0), 'todo')).toEqual([
			'TL-3',
			'TL-1',
			'TL-2'
		]);
	});

	it('moves a ticket to another column, giving it that column', () => {
		const placed = placeAt(tickets, tickets[1]!, 'done', 0);
		expect(columnIds(placed, 'done')).toEqual(['TL-2', 'TL-4']);
		expect(columnIds(placed, 'todo')).toEqual(['TL-1', 'TL-3']);
		expect(placed.find((each) => each.id === 'TL-2')?.column).toBe('done');
	});

	it('puts a ticket last at an index equal to the column without it', () => {
		expect(columnIds(placeAt(tickets, tickets[0]!, 'todo', 2), 'todo')).toEqual([
			'TL-2',
			'TL-3',
			'TL-1'
		]);
		expect(columnIds(placeAt(tickets, tickets[0]!, 'done', 1), 'done')).toEqual(['TL-4', 'TL-1']);
	});

	it('counts only the tickets under the same parent in the column', () => {
		const nested = [
			ticket('TL-1', 'todo', 'TL-11'),
			ticket('TL-2', 'todo', 'TL-12'),
			ticket('TL-3', 'todo', 'TL-11'),
			ticket('TL-4', 'todo', 'TL-11')
		];
		const placed = placeAt(nested, nested[3]!, 'todo', 1);
		expect(ids(placed.filter((each) => each.parent === 'TL-11'))).toEqual(['TL-1', 'TL-4', 'TL-3']);
		expect(placed).toHaveLength(nested.length);
	});

	it('leaves the board it was given unchanged', () => {
		const before = structuredClone(tickets);
		placeAt(tickets, tickets[0]!, 'done', 0);
		expect(tickets).toEqual(before);
	});
});

describe('familyOf', () => {
	const board = [
		ticket('TL-100', 'todo', null),
		ticket('TL-1', 'todo', 'TL-100'),
		ticket('TL-2', 'todo', 'TL-1'),
		ticket('TL-3', 'todo', 'TL-2'),
		ticket('TL-12', 'todo', null),
		ticket('TL-4', 'todo', 'TL-12')
	];

	it('gives the ticket and everything below it, at any depth, and nothing else', () => {
		expect([...familyOf(board, 'TL-100')].toSorted()).toEqual(['TL-1', 'TL-100', 'TL-2', 'TL-3']);
		expect([...familyOf(board, 'TL-2')].toSorted()).toEqual(['TL-2', 'TL-3']);
		expect([...familyOf(board, 'TL-4')]).toEqual(['TL-4']);
	});

	it('stops at the depth limit on a chain deeper than the board allows', () => {
		const chain = Array.from({ length: depthMax + 5 }, (_unused, level) =>
			ticket(
				level === 0 ? 'TL-100' : `TL-${level}`,
				'todo',
				level === 0 ? null : level === 1 ? 'TL-100' : `TL-${level - 1}`
			)
		);
		expect(familyOf(chain, 'TL-100').size).toBe(depthMax);
	});

	it('stops on a loop', () => {
		const looped = [ticket('TL-1', 'todo', 'TL-2'), ticket('TL-2', 'todo', 'TL-1')];
		expect([...familyOf(looped, 'TL-1')].toSorted()).toEqual(['TL-1', 'TL-2']);
	});
});
