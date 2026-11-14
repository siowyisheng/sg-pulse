const SINGAPORE_OFFSET_MS = 8 * 60 * 60_000;

/** A Cycle, named by its Singapore calendar date: YYYY-MM-DD. */
export type Cycle = string;

/**
 * The Cycle a moment falls in: the Singapore calendar day, 00:00 to 23:59 SGT. Always worked out
 * from the moment itself, never from a scheduled job. Singapore has no daylight saving.
 */
export function cycleOf(moment: Date): Cycle {
  return new Date(moment.getTime() + SINGAPORE_OFFSET_MS).toISOString().slice(0, 10);
}

/** Whether this names a real calendar date, as YYYY-MM-DD. */
export function isCycle(value: string): value is Cycle {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

const dayAfter = (cycle: Cycle, days: number): Cycle => new Date(Date.parse(`${cycle}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

/** The Cycle after this one. */
export const nextCycle = (cycle: Cycle): Cycle => dayAfter(cycle, 1);

/** The Cycle before this one. */
export const previousCycle = (cycle: Cycle): Cycle => dayAfter(cycle, -1);

/** The hour in Singapore from which a new Feeling is queued for the next Cycle. */
export const CUT_OFF_HOUR = 21;

/**
 * The Cycle a Feeling submitted at this moment competes in: today's, or from 21:00 SGT tomorrow's,
 * so the last Feelings of a day are not up against ones that have gathered Upvotes since morning.
 */
export function submissionCycleOf(moment: Date): Cycle {
  const today = cycleOf(moment);
  const hour = new Date(moment.getTime() + SINGAPORE_OFFSET_MS).getUTCHours();
  return hour >= CUT_OFF_HOUR ? nextCycle(today) : today;
}
