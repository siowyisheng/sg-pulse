import type { Polarity } from "@/core/feeling-rules";

export const POLARITY_LABEL = { good: "Good", bad: "Bad" } as const;

/** The Polarity a URL names, if it names one. */
export const polarityFrom = (param: string): Polarity | undefined => (param === "good" || param === "bad" ? param : undefined);

/** A URL segment as the person typed it; Next hands non-English ones over still encoded. */
export function decoded(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}
