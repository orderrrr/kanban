// Selecting several cards with a box drawn by the pointer. Like a lift, a press
// only becomes a box once the pointer has moved a few pixels, so a plain click
// on empty space stays a click.

const boxDistanceMin = 5;

// A box in window coordinates.
export interface Box {
	left: number;
	top: number;
	right: number;
	bottom: number;
}

interface SelectHandlers {
	// The box from where the press started to where the pointer is now.
	onBox: (box: Box) => void;
	// The press ended; `drew` says whether it became a box or stayed a click.
	onEnd: (drew: boolean) => void;
	// Escape gave up on the box.
	onCancel: () => void;
}

// Starts watching a press on empty space. Only a mouse or pen draws a box: a
// finger on empty space scrolls the board instead. Moves, the release and
// Escape are followed on the window until the press ends, then every listener
// is removed.
export function pressToSelect(event: PointerEvent, handlers: SelectHandlers): void {
	if (event.button !== 0 || !event.isPrimary || event.pointerType === 'touch') return;
	const startX = event.clientX;
	const startY = event.clientY;
	let drawing = false;

	function move(moved: PointerEvent): void {
		if (!drawing) {
			if (Math.hypot(moved.clientX - startX, moved.clientY - startY) < boxDistanceMin) return;
			drawing = true;
			document.body.classList.add('lifting');
		}
		moved.preventDefault();
		handlers.onBox(boxBetween(startX, startY, moved.clientX, moved.clientY));
	}

	function release(): void {
		finish();
		handlers.onEnd(drawing);
	}

	// Escape gives up on the press. Once a box is drawn, it also marks the key
	// used so nothing else acts on it; it listens in the capture phase, so it
	// hears the key before any other listener on the window.
	function escape(pressed: KeyboardEvent): void {
		if (pressed.key !== 'Escape') return;
		if (drawing) pressed.preventDefault();
		finish();
		handlers.onCancel();
	}

	function finish(): void {
		document.body.classList.remove('lifting');
		window.removeEventListener('pointermove', move);
		window.removeEventListener('pointerup', release);
		window.removeEventListener('pointercancel', release);
		window.removeEventListener('keydown', escape, true);
	}

	window.addEventListener('pointermove', move);
	window.addEventListener('pointerup', release);
	window.addEventListener('pointercancel', release);
	window.addEventListener('keydown', escape, true);
}

function boxBetween(startX: number, startY: number, endX: number, endY: number): Box {
	return {
		left: Math.min(startX, endX),
		top: Math.min(startY, endY),
		right: Math.max(startX, endX),
		bottom: Math.max(startY, endY)
	};
}

// Says whether two boxes share any area; boxes that only touch at an edge
// don't.
export function overlaps(first: Box, second: Box): boolean {
	return (
		first.left < second.right &&
		second.left < first.right &&
		first.top < second.bottom &&
		second.top < first.bottom
	);
}
