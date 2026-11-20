<script lang="ts">
	import type { Schedule } from '../types';
	import { displayDate } from './dates';

	interface Props {
		schedule: Schedule;
	}

	let { schedule }: Props = $props();
</script>

{#if schedule === null}
	<span class="date-range">Not scheduled</span>
{:else}
	<span class="date-range">{displayDate(schedule.start)} to {displayDate(schedule.due)}</span>
{/if}
