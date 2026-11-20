import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { svelteTesting } from '@testing-library/svelte/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [
		sveltekit({
			// Writes the prerendered site to `build/`, which the Zig server serves.
			adapter: adapter({ pages: 'build', assets: 'build', strict: true }),
			preprocess: vitePreprocess()
		}),
		// In tests only, this uses Svelte's browser build and cleans the DOM after each test.
		svelteTesting()
	],
	test: {
		// Logic tests run in Node; a component test opts into a browser-like DOM
		// with `// @vitest-environment jsdom` at its top.
		environment: 'node',
		// The time zone is fixed so date tests behave the same on every machine.
		// Etc/GMT-2 is UTC+2 (the Etc sign is reversed), with no daylight saving.
		env: { TZ: 'Etc/GMT-2' },
		// Node 26's own `localStorage` global would hide jsdom's in component tests.
		execArgv: ['--no-experimental-webstorage'],
		include: ['src/**/*.test.ts'],
		// Fills the one gap in jsdom that Svelte's list animations reach.
		setupFiles: ['src/test-setup.ts']
	}
});
