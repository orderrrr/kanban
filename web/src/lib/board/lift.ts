// Picking things up with the pointer. A press only becomes a lift once the
// pointer has moved a few pixels, so clicks on the same element still work.

const liftDistanceMin = 5;

// Pressing on a field or a marked control means using it, never lifting what
// holds it. A ticket's ID and name are buttons that can also be grabbed, so
// buttons are marked one by one with `data-no-lift` rather than all excluded.
const controls = 'input, textarea, select, a, [data-no-lift]';

export interface Lifted {
	// Where in the lifted element it was grabbed, so it doesn't jump to the pointer.
	offsetX: number;
	offsetY: number;
	width: number;
	height: number;
}

export interface LiftHandlers {
	onLift: (lifted: Lifted, x: number, y: number) => void;
	onMove: (x: number, y: number) => void;
	onDrop: () => void;
	onCancel: () => void;
}

// Starts watching a press on `element`. Moves, the release and Escape are
// followed on the window until the press ends, then every listener is removed.
export function pressToLift(
	event: PointerEvent,
	element: HTMLElement,
	handlers: LiftHandlers
): void {
	if (event.button !== 0 || !event.isPrimary) return;
	if (event.target instanceof Element && event.target.closest(controls) !== null) return;
	event.stopPropagation();
	const startX = event.clientX;
	const startY = event.clientY;
	let lifting = false;

	function move(moved: PointerEvent): void {
		if (!lifting) {
			if (Math.hypot(moved.clientX - startX, moved.clientY - startY) < liftDistanceMin) return;
			lifting = true;
			const box = element.getBoundingClientRect();
			document.body.classList.add('lifting');
			handlers.onLift(
				{
					offsetX: startX - box.left,
					offsetY: startY - box.top,
					width: box.width,
					height: box.height
				},
				moved.clientX,
				moved.clientY
			);
		}
		moved.preventDefault();
		handlers.onMove(moved.clientX, moved.clientY);
	}

	function release(): void {
		finish();
		if (lifting) handlers.onDrop();
	}

	function cancel(): void {
		finish();
		if (lifting) handlers.onCancel();
	}

	// Escape cancels the press. Once a card is carried, it also marks the key
	// used so nothing else acts on it; it listens in the capture phase, so it
	// hears the key before any other listener on the window.
	function escape(pressed: KeyboardEvent): void {
		if (pressed.key !== 'Escape') return;
		if (lifting) pressed.preventDefault();
		cancel();
	}

	function finish(): void {
		document.body.classList.remove('lifting');
		window.removeEventListener('pointermove', move);
		window.removeEventListener('pointerup', release);
		window.removeEventListener('pointercancel', cancel);
		window.removeEventListener('keydown', escape, true);
	}

	window.addEventListener('pointermove', move);
	window.addEventListener('pointerup', release);
	window.addEventListener('pointercancel', cancel);
	window.addEventListener('keydown', escape, true);
}

// Gives where something dropped at height `y` lands among items whose middles
// are `middles`, top to bottom: before the first middle below `y`.
export function landingIndex(y: number, middles: number[]): number {
	const below = middles.findIndex((middle) => y < middle);
	return below === -1 ? middles.length : below;
}

// Gives the vertical middles of the elements matching `selector` inside
// `container`, in page order.
export function middlesOf(container: Element, selector: string): number[] {
	return [...container.querySelectorAll(selector)].map((item) => {
		const box = item.getBoundingClientRect();
		return box.top + box.height / 2;
	});
}

// Says whether the point lies inside `element`'s box.
export function contains(element: Element, x: number, y: number): boolean {
	const box = element.getBoundingClientRect();
	return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
}

// Attaches a press handler to a list row. The row is only a place to grab; the
// keyboard way to move the same thing is a control inside the row (a ticket's
// ID button).
export function grabbable(
	onPress: (event: PointerEvent) => void
): (element: HTMLElement) => () => void {
	return (element) => {
		element.addEventListener('pointerdown', onPress);
		return () => element.removeEventListener('pointerdown', onPress);
	};
}
