import { Clock, Frown, Hourglass, Repeat, Smile, Users } from "lucide-react";
import type { ReactNode } from "react";
import type { Polarity } from "@/core/feeling-rules";

const POLARITY = {
  good: { label: "Good", Icon: Smile },
  bad: { label: "Bad", Icon: Frown },
} as const;

/** A Feeling's Polarity: always the face and the word, never the colour alone. */
export function PolarityBadge({ polarity }: { polarity: Polarity }) {
  const { label, Icon } = POLARITY[polarity];
  return (
    <span className={`badge badge-${polarity}`}>
      <Icon aria-hidden="true" size={14} />
      {label}
    </span>
  );
}

/** Who wrote a Feeling, e.g. "TA · M · 30s". */
export function BylineChip({ children }: { children: ReactNode }) {
  return <span className="chip chip-byline">{children}</span>;
}

/** Marks a Seed Feeling, which has no Byline. */
export function FromTheTeamChip() {
  return (
    <span className="chip chip-byline">
      <Users aria-hidden="true" size={14} />
      From the team
    </span>
  );
}

/** On a Submitter's own Feeling sent in after 21:00. */
export function QueuedForTomorrowChip() {
  return (
    <span className="chip chip-neutral">
      <Clock aria-hidden="true" size={14} />
      Queued for tomorrow
    </span>
  );
}

/** Marks a Carry-over. */
export function StillFeelingItChip() {
  return (
    <span className="chip chip-neutral">
      <Repeat aria-hidden="true" size={14} />
      Still feeling it
    </span>
  );
}

/** On a Submitter's own Feeling while a Report on it is open. */
export function UnderReviewChip() {
  return (
    <span className="chip chip-warning">
      <Hourglass aria-hidden="true" size={14} />
      Under review
    </span>
  );
}
