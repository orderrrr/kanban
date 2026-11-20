import type { IsoDate, Schedule } from '../types';

// Gives the viewer's local calendar date. `toISOString()` would give the UTC date,
// which in UTC+2 is still yesterday between midnight and 02:00.
export function localToday(now: Date): IsoDate {
	const year = String(now.getFullYear()).padStart(4, '0');
	const month = String(now.getMonth() + 1).padStart(2, '0');
	const day = String(now.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

// Formats a date the way the board shows it, as DD/MM/YYYY.
export function displayDate(date: IsoDate): string {
	const [year, month, day] = date.split('-');
	return `${day}/${month}/${year}`;
}

// Reads two date fields: both empty is no schedule, both filled is that
// schedule, and null means only one is filled, which the form refuses itself.
export function readSchedule(start: string, due: string): { schedule: Schedule } | null {
	if (start === '' && due === '') return { schedule: null };
	if (start === '' || due === '') return null;
	return { schedule: { start, due } };
}

// Formats a moment the way the board shows it, as DD/MM/YYYY HH:MM in the
// viewer's own time zone.
export function displayTime(moment: string): string {
	const at = new Date(moment);
	const two = (part: number) => String(part).padStart(2, '0');
	const date = `${two(at.getDate())}/${two(at.getMonth() + 1)}/${at.getFullYear()}`;
	return `${date} ${two(at.getHours())}:${two(at.getMinutes())}`;
}
