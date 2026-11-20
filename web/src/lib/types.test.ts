import { describe, expect, it } from 'vitest';
import type { Column, Schedule, Ticket } from './types';
import {
	ApiError,
	charCount,
	generatedNumber,
	generatedNumberMax,
	isOverdue,
	isSchedule,
	isTicketId
} from './types';

describe('isTicketId', () => {
	it.each(['TL-1', 'TL-1234', 'TL-99999999'])('accepts %s', (id) => {
		expect(isTicketId(id)).toBe(true);
	});

	it.each(['TL-0', 'TL-01', 'TL-123456789', 'tl-1', 'TL-', 'TL-1 ', 'DEV-1', 'DEV-1234'])(
		'refuses %j: zero, a leading zero, too many digits, lower case, no digits, trailing text or another prefix',
		(id) => {
			expect(isTicketId(id)).toBe(false);
		}
	);
});

describe('generatedNumber', () => {
	it('gives the number in a generated ID, up to generatedNumberMax', () => {
		expect(generatedNumber('TL-1')).toBe(1);
		expect(generatedNumber('TL-109')).toBe(109);
		expect(generatedNumber(`TL-${generatedNumberMax}`)).toBe(generatedNumberMax);
	});

	it.each(['DEV-1', 'TL-0', 'TL-01', `TL-${generatedNumberMax + 1}`, 'tl-1'])(
		'gives null for %j, which is not a generated ID',
		(id) => {
			expect(generatedNumber(id)).toBeNull();
		}
	);
});

describe('isSchedule', () => {
	it('accepts no schedule', () => {
		expect(isSchedule(null)).toBe(true);
	});

	it.each([
		['2026-11-03', '2026-11-03'],
		['2028-02-29', '2028-03-01'],
		['2026-04-30', '2026-04-30'],
		// Year 0000 is a valid date here; the Zig server must accept it too.
		['0000-01-01', '0000-01-01']
	])('accepts start %s on or before due %s', (start, due) => {
		expect(isSchedule({ start, due })).toBe(true);
	});

	it('refuses start after due', () => {
		expect(isSchedule({ start: '2026-11-04', due: '2026-11-03' })).toBe(false);
	});

	const badDates = [
		'2026-02-29',
		'2026-02-30',
		'2026-04-31',
		'2026-13-01',
		'2026-00-10',
		'2026-1-01'
	];

	it.each(badDates)('refuses %s as a start date', (bad) => {
		expect(isSchedule({ start: bad, due: '2030-01-01' })).toBe(false);
	});

	it.each(badDates)('refuses %s as a due date', (bad) => {
		expect(isSchedule({ start: '2000-01-01', due: bad })).toBe(false);
	});
});

describe('isOverdue', () => {
	const today = '2026-11-03';
	const ticket = (column: Column, schedule: Schedule): Ticket => ({
		id: 'TL-1',
		name: 'Overdue case',
		column,
		schedule,
		parent: null,
		description: ''
	});

	it.each<Column>(['backlog', 'todo', 'in_progress'])(
		'is true in %s when due before today',
		(column) => {
			expect(isOverdue(ticket(column, { start: '2026-11-01', due: '2026-11-02' }), today)).toBe(
				true
			);
		}
	);

	it('is false on the due date itself', () => {
		expect(isOverdue(ticket('todo', { start: '2026-11-01', due: today }), today)).toBe(false);
	});

	it('is false in Done and without a schedule', () => {
		expect(isOverdue(ticket('done', { start: '2026-10-01', due: '2026-10-02' }), today)).toBe(
			false
		);
		expect(isOverdue(ticket('todo', null), today)).toBe(false);
	});
});

describe('charCount', () => {
	it('counts characters, not bytes or UTF-16 units', () => {
		expect(charCount('abc')).toBe(3);
		expect(charCount('é')).toBe(1);
		expect(charCount('😀')).toBe(1);
		expect(charCount('é'.repeat(64))).toBe(64);
	});
});

describe('ApiError', () => {
	it('carries its code and name', () => {
		const error = new ApiError('not_found');
		expect(error.code).toBe('not_found');
		expect(error.name).toBe('ApiError');
		expect(error).toBeInstanceOf(Error);
	});
});
