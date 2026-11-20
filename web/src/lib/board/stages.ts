import type { Column, Ticket } from '../types';
import { columns } from '../types';

// Each stage's colour, for the status boxes and the progress bars. Each reaches
// 3:1 against the column's #eceef1 and against white (WCAG 1.4.11): grey 5.26
// and 6.11, yellow 3.47 and 4.03, orange 4.04 and 4.70, green 4.37 and 5.08.
// The grey is the one the rest of the board uses.
export const stageColours: Record<Column, string> = {
	backlog: '#59636e',
	todo: '#9a7b00',
	in_progress: '#c25100',
	done: '#1a7f37'
};

// A progress bar shows the stages from the left in this order, furthest along
// first, so the done part always starts the bar.
const barOrder: readonly Column[] = [...columns].reverse();

// How a count of tickets in each stage is said: "2 done", "1 in backlog".
const countWords: Record<Column, string> = {
	done: 'done',
	in_progress: 'in progress',
	todo: 'to do',
	backlog: 'in backlog'
};

interface StageCount {
	stage: Column;
	count: number;
}

// How many of `tickets` are in each stage, in bar order, leaving out the
// stages that have none.
export function stageCounts(tickets: Ticket[]): StageCount[] {
	return barOrder
		.map((stage) => ({ stage, count: tickets.filter((ticket) => ticket.column === stage).length }))
		.filter(({ count }) => count > 0);
}

// The counts in words, such as "2 done, 1 in progress, 1 to do".
export function countsText(counts: StageCount[]): string {
	return counts.map(({ stage, count }) => `${count} ${countWords[stage]}`).join(', ');
}
