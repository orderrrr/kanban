<!-- Test-only: the board page under a given `Api`, as the root layout would set it. -->
<script lang="ts">
	import { untrack } from 'svelte';
	import type { Api } from '../lib/api';
	import { setApi, setToday } from '../lib/context';
	import Page from './+page.svelte';

	interface Props {
		api: Api;
	}

	let { api }: Props = $props();

	// Context is set once, from the first value, as the root layout does.
	setApi(untrack(() => api));
	setToday('2026-11-03');
</script>

<Page />
