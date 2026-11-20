import { cubicOut } from 'svelte/easing';

// How long things take to move, in milliseconds: quick enough never to slow
// anyone down. CSS transitions use the same values and curve, set on the page
// by the root layout as `--duration-short`, `--duration-long` and `--easing`.
export const durationShort = 120;
export const durationLong = 200;
export const easing = cubicOut;
// `cubicOut` as CSS draws it.
export const easingCss = 'cubic-bezier(0.33, 1, 0.68, 1)';

// Whether things may move: not when the system asks for reduced motion, nor
// where that can't be asked (the tests' DOM has no `matchMedia`), so nothing
// there waits on an animation.
export function motionAllowed(): boolean {
	if (typeof matchMedia !== 'function') return false;
	return !matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// A duration for a Svelte transition, or none where things may not move.
export function motion(duration: number): number {
	return motionAllowed() ? duration : 0;
}
