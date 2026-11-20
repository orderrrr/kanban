import { describe, expect, it } from 'vitest';
import { landingIndex } from './lift';

describe('landingIndex', () => {
	const middles = [100, 200, 300];

	it('lands before the first item whose middle is below the pointer', () => {
		expect(landingIndex(50, middles)).toBe(0);
		expect(landingIndex(150, middles)).toBe(1);
		expect(landingIndex(299, middles)).toBe(2);
	});

	it('lands last below every middle, and on an exact middle goes after it', () => {
		expect(landingIndex(350, middles)).toBe(3);
		expect(landingIndex(200, middles)).toBe(2);
	});

	it('lands first in an empty list', () => {
		expect(landingIndex(10, [])).toBe(0);
	});
});
