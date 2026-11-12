import type { Cycle } from "@/core/cycle";

/** A Cycle as a person reads it: "Thu, 12 Nov". */
export function formatCycle(cycle: Cycle): string {
  return new Intl.DateTimeFormat("en-SG", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${cycle}T00:00:00Z`));
}

/** A count of Upvotes as it reads: "1 Yah Lah", "12 Yah Lahs". */
export const yahLahs = (count: number): string => `${count} Yah Lah${count === 1 ? "" : "s"}`;

/** A moment as a person in Singapore reads it: "19 Nov, 9:02 am". */
export function formatMoment(moment: Date): string {
  return new Intl.DateTimeFormat("en-SG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Singapore" }).format(moment);
}
