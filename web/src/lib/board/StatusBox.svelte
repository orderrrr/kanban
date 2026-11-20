<script lang="ts">
	import type { Column } from '../types';
	import { stageColours } from './stages';

	interface Props {
		status: Column;
	}

	let { status }: Props = $props();
</script>

<!-- The box shows a status by its shape: dashed for Backlog, empty for To do,
     half filled for In progress, ticked for Done. Its colour repeats the status
     for a quicker glance; the shape alone still tells them apart. -->
<span
	class="box"
	data-status={status}
	style:--status-colour={stageColours[status]}
	aria-hidden="true"
></span>

<style>
	.box {
		display: block;
		flex: none;
		box-sizing: border-box;
		width: 13px;
		height: 13px;
		border: 1px solid var(--status-colour);
		border-radius: 3px;
		background: #fff;
	}

	.box[data-status='backlog'] {
		border-style: dashed;
	}

	.box[data-status='in_progress'] {
		background: linear-gradient(to right, var(--status-colour) 50%, #fff 50%);
	}

	.box[data-status='done'] {
		position: relative;
		background: var(--status-colour);
	}

	.box[data-status='done']::after {
		content: '';
		position: absolute;
		left: 3px;
		top: 0;
		width: 3px;
		height: 7px;
		border: solid #fff;
		border-width: 0 2px 2px 0;
		transform: rotate(45deg);
	}
</style>
