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
