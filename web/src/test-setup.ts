// jsdom has no Web Animations, but Svelte asks an element leaving an animated
// list what animations it is running. Tests run with no motion (`motion.ts`),
// so the true answer there is always none.
if (typeof Element !== 'undefined' && !('getAnimations' in Element.prototype)) {
	Object.defineProperty(Element.prototype, 'getAnimations', { value: () => [] });
}
