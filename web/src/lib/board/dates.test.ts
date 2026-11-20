import { describe, expect, it } from 'vitest';
import { displayDate, localToday } from './dates';

// The tests run in UTC+2 (set in vite.config.ts), where the UTC date lags
// the local date for the first two hours of each day.
describe('localToday', () => {
	it('gives the local date just after midnight, when the UTC date is still yesterday', () => {
		const now = new Date('2026-11-03T00:30:00+02:00');
		expect(now.toISOString().slice(0, 10)).toBe('2026-11-02');
		expect(localToday(now)).toBe('2026-11-03');
	});

	it('gives the same date at the last minute of the day', () => {
		expect(localToday(new Date('2026-11-03T23:59:00+02:00'))).toBe('2026-11-03');
	});

	it('pads months and days to two digits', () => {
		expect(localToday(new Date('2026-01-05T12:00:00+02:00'))).toBe('2026-01-05');
	});
});

describe('displayDate', () => {
	it('shows an IsoDate as DD/MM/YYYY', () => {
		expect(displayDate('2026-11-03')).toBe('03/11/2026');
		expect(displayDate('2028-02-29')).toBe('29/02/2028');
	});
});
