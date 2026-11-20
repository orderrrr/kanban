import { afterEach, describe, expect, it, vi } from 'vitest';
import { durationLong, motion, motionAllowed } from './motion';

afterEach(() => {
	vi.unstubAllGlobals();
});

function preferReducedMotion(reduce: boolean): void {
	vi.stubGlobal('matchMedia', (query: string) => ({
		matches: reduce && query === '(prefers-reduced-motion: reduce)'
	}));
}

describe('motion', () => {
	it('gives the duration when the system allows motion', () => {
		preferReducedMotion(false);
		expect(motion(durationLong)).toBe(durationLong);
	});

	it('gives none when the system asks for reduced motion', () => {
		preferReducedMotion(true);
		expect(motion(durationLong)).toBe(0);
	});

	it("gives none where the preference can't be read", () => {
		expect(motion(durationLong)).toBe(0);
	});
});

describe('motionAllowed', () => {
	it('allows motion unless the system asks for less', () => {
		preferReducedMotion(false);
		expect(motionAllowed()).toBe(true);
		preferReducedMotion(true);
		expect(motionAllowed()).toBe(false);
	});

	it("doesn't allow it where the preference can't be read", () => {
		expect(motionAllowed()).toBe(false);
	});
});
