import type { Cycle } from "@/core/cycle";

/** A Cycle as a person reads it: "Thu, 12 Nov". */
export function formatCycle(cycle: Cycle): string {
  return new Intl.DateTimeFormat("en-SG", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${cycle}T00:00:00Z`));
}
