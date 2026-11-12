import type { Random } from "./ports";

/** How many Candidates the Hashtag screen shows at once. */
export const CANDIDATES_SHOWN = 10;

/** Of those: the most upvoted, then ones whose Upvotes are recent, then ones hardly anyone has upvoted yet. */
const TOP_PLACES = 5;
const RISING_PLACES = 3;

/** A Candidate's freshness score halves every this many hours. */
export const RISING_HALF_LIFE_HOURS = 3;
/** Rising: at least this share of its Upvotes still counts as fresh... */
const RISING_SHARE = 0.5;
/** ...and it has at least this many, so one early Upvote isn't a trend. */
const RISING_MINIMUM_UPVOTES = 2;
/** New: no more Upvotes than this. */
const NEW_MAXIMUM_UPVOTES = 1;

export interface Ranked {
  upvotes: number;
  /** The freshness score as last written, and when. */
  risingScore: number;
  risingAt: Date | null;
  createdAt: Date;
}

/** A Candidate's freshness score as of now: what was stored, halved for every half-life since. */
export function risingScoreAt(candidate: Ranked, now: Date): number {
  if (!candidate.risingAt) return 0;
  const hours = Math.max(0, now.getTime() - candidate.risingAt.getTime()) / 3_600_000;
  return candidate.risingScore * 0.5 ** (hours / RISING_HALF_LIFE_HOURS);
}

/** Most Upvotes first; ties go to the one written earliest. */
export const byRank = (a: Ranked, b: Ranked) => b.upvotes - a.upvotes || a.createdAt.getTime() - b.createdAt.getTime();

/** A jumbled copy, so position says nothing. */
export function jumbled<T>(items: T[], random: Random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

/**
 * Which Candidates to show, jumbled. All of them when there are 10 or fewer. Otherwise about 5 with
 * the most Upvotes, 3 Rising and 2 New, so fresh Feelings are seen; a group that is short gives its
 * places to New ones (picked by the dice, so they take turns) and then to the next most upvoted.
 */
export function mixOf<T extends Ranked>(candidates: T[], now: Date, random: Random): T[] {
  if (candidates.length <= CANDIDATES_SHOWN) return jumbled(candidates, random);
  const chosen = new Set<T>();
  const left = () => candidates.filter((candidate) => !chosen.has(candidate));
  const take = (from: T[], places: number) => from.slice(0, Math.max(0, places)).forEach((candidate) => chosen.add(candidate));

  take(left().filter((candidate) => candidate.upvotes > 0).sort(byRank), TOP_PLACES);

  const share = (candidate: T) => risingScoreAt(candidate, now) / candidate.upvotes;
  const rising = left()
    .filter((candidate) => candidate.upvotes >= RISING_MINIMUM_UPVOTES && share(candidate) >= RISING_SHARE)
    .sort((a, b) => share(b) - share(a) || byRank(a, b));
  take(rising, RISING_PLACES);

  // New ones take the two places kept for them, and any the groups above couldn't fill.
  const fresh = left().filter((candidate) => candidate.upvotes <= NEW_MAXIMUM_UPVOTES);
  const placesForNew = CANDIDATES_SHOWN - TOP_PLACES - RISING_PLACES + (TOP_PLACES + RISING_PLACES - chosen.size);
  take(jumbled(fresh, random), placesForNew);

  take(left().sort(byRank), CANDIDATES_SHOWN - chosen.size);
  return jumbled([...chosen], random);
}
