import { Check, Clock, Frown, Hourglass, Repeat, Smile, Sprout, TrendingUp, Users } from "lucide-react";
import type { ReactNode } from "react";
import type { Standing } from "@/core/candidate-mix";
import type { Polarity } from "@/core/feeling-rules";
import { Emoji, POLARITY_EMOJI } from "./emoji";

const POLARITY = {
  good: { label: "Good", Icon: Smile },
  bad: { label: "Bad", Icon: Frown },
} as const;

/** A Feeling's Polarity: always the face and the word, never the colour alone. */
export function PolarityBadge({ polarity }: { polarity: Polarity }) {
  const { label, Icon } = POLARITY[polarity];
  return (
    <span className={`badge badge-${polarity} has-emoji`}>
      <Icon aria-hidden="true" size={14} />
      <Emoji char={POLARITY_EMOJI[polarity]} />
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
    <span className="chip chip-byline has-emoji">
      <Users aria-hidden="true" size={14} />
      <Emoji char="👋" />
      From the team
    </span>
  );
}

/** On a Submitter's own Feeling sent in after 21:00. */
export function QueuedForTomorrowChip() {
  return (
    <span className="chip chip-neutral has-emoji">
      <Clock aria-hidden="true" size={14} />
      <Emoji char="⏳" />
      Queued for tomorrow
    </span>
  );
}

/** Marks a Carry-over. */
export function StillFeelingItChip() {
  return (
    <span className="chip chip-neutral has-emoji">
      <Repeat aria-hidden="true" size={14} />
      <Emoji char="🔁" />
      Still feeling it
    </span>
  );
}

/** Something waiting on the Admin: by default, a Submitter's own Feeling while a Report on it is open. */
export function UnderReviewChip({ label = "Under review" }: { label?: string }) {
  return (
    <span className="chip chip-warning has-emoji">
      <Hourglass aria-hidden="true" size={14} />
      <Emoji char="🔍" />
      {label}
    </span>
  );
}

/** Where something stands, in plain words: "Candidate today", "Expired". */
export function StateChip({ children, emoji }: { children: ReactNode; emoji?: string }) {
  return (
    <span className="chip chip-neutral">
      <Emoji char={emoji} />
      {children}
    </span>
  );
}

/** Marks the Candidate holding the User's Upvote: clear, but quiet. */
export function YourYahLahChip() {
  return (
    <span className="chip chip-byline has-emoji">
      <Check aria-hidden="true" size={14} />
      <Emoji char="🙌" />
      Your Yah Lah
    </span>
  );
}

/** Why a Candidate is in the list: a burst of recent Upvotes, or hardly any yet. Never a count. */
export function StandingChip({ standing }: { standing: Standing }) {
  return standing === "rising" ? (
    <span className="chip chip-neutral has-emoji">
      <TrendingUp aria-hidden="true" size={14} />
      <Emoji char="🔥" />
      Rising
    </span>
  ) : (
    <span className="chip chip-neutral has-emoji">
      <Sprout aria-hidden="true" size={14} />
      <Emoji char="🌱" />
      New
    </span>
  );
}
