// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Box } from './select';
import { overlaps, pressToSelect } from './select';

afterEach(() => {
	window.dispatchEvent(new PointerEvent('pointerup', { isPrimary: true }));
});

const box = (left: number, top: number, right: number, bottom: number): Box => ({
	left,
	top,
	right,
	bottom
});

describe('overlaps', () => {
	it('says boxes that share area overlap', () => {
		expect(overlaps(box(0, 0, 10, 10), box(5, 5, 15, 15))).toBe(true);
	});

	it("says boxes that only touch at an edge don't", () => {
		expect(overlaps(box(0, 0, 10, 10), box(10, 0, 20, 10))).toBe(false);
		expect(overlaps(box(0, 0, 10, 10), box(0, 10, 10, 20))).toBe(false);
	});

	it("says boxes apart don't", () => {
		expect(overlaps(box(0, 0, 10, 10), box(30, 30, 40, 40))).toBe(false);
	});
});

describe('pressToSelect', () => {
	function start(handlers = { onBox: vi.fn(), onEnd: vi.fn(), onCancel: vi.fn() }) {
		pressToSelect(
			new PointerEvent('pointerdown', { button: 0, isPrimary: true, clientX: 100, clientY: 100 }),
			handlers
		);
		return handlers;
	}

	function moveTo(x: number, y: number): void {
		window.dispatchEvent(
			new PointerEvent('pointermove', { clientX: x, clientY: y, isPrimary: true })
		);
	}

	it('stays a click below 5 pixels of movement', () => {
		const handlers = start();
		moveTo(104, 100);
		window.dispatchEvent(new PointerEvent('pointerup', { isPrimary: true }));
		expect(handlers.onBox).not.toHaveBeenCalled();
		expect(handlers.onEnd).toHaveBeenCalledWith(false);
	});

	it('draws a box from 5 pixels, from the press to the pointer either way', () => {
		const handlers = start();
		moveTo(95, 100);
		moveTo(60, 140);
		window.dispatchEvent(new PointerEvent('pointerup', { isPrimary: true }));
		expect(handlers.onBox).toHaveBeenLastCalledWith(box(60, 100, 100, 140));
		expect(handlers.onEnd).toHaveBeenCalledWith(true);
	});

	it('gives up on Escape and stops following the pointer', () => {
		const handlers = start();
		moveTo(120, 120);
		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
		moveTo(200, 200);
		expect(handlers.onCancel).toHaveBeenCalledOnce();
		expect(handlers.onBox).toHaveBeenCalledOnce();
		expect(handlers.onEnd).not.toHaveBeenCalled();
	});

	it('leaves a finger on empty space to scroll', () => {
		const handlers = { onBox: vi.fn(), onEnd: vi.fn(), onCancel: vi.fn() };
		pressToSelect(
			new PointerEvent('pointerdown', {
				button: 0,
				isPrimary: true,
				pointerType: 'touch',
				clientX: 100,
				clientY: 100
			}),
			handlers
		);
		moveTo(200, 200);
		window.dispatchEvent(new PointerEvent('pointerup', { isPrimary: true }));
		expect(handlers.onBox).not.toHaveBeenCalled();
		expect(handlers.onEnd).not.toHaveBeenCalled();
	});
});
