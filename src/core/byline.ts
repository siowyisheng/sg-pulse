import { cycleOf } from "./cycle";

/** Youngest age at which someone may take part (the PDPC's line for giving one's own consent). */
export const MINIMUM_AGE = 13;
/** Below this a Byline carries no initials. */
const ADULT_AGE = 18;

export type Sex = "M" | "F";
export type AgeBand = "<18" | "<20" | "20s" | "30s" | "40s" | "50s" | "60+";

/** What is shown beside a Feeling about its Submitter. Never a name or a username. */
export interface Byline {
  /** Null for a Submitter under 18. */
  initials: string | null;
  /** Null when Myinfo records it as unknown. */
  sex: Sex | null;
  ageBand: AgeBand;
}

/** Words in a name that are not part of it: "son of", "daughter of" and the like. */
const PARTICLES = new Set(["BIN", "BINTE", "BINTI", "BTE", "S/O", "D/O", "A/L", "A/P"]);

/**
 * The first letter of each of the first two words of a name, skipping particles, so
 * "MUHAMMAD BIN ABDULLAH" is "MA". A particle that opens the name is a name ("BIN LADEN").
 */
export function initialsOf(name: string): string {
  const words = name
    .toUpperCase()
    .split(/[\s,]+/)
    .filter((word, index) => index === 0 || !PARTICLES.has(word))
    .map((word) => word.match(/\p{L}/u)?.[0])
    .filter((letter) => letter !== undefined);
  return words.slice(0, 2).join("");
}

/** Myinfo's sex code as a Byline shows it; anything but male or female is left out. */
export const sexOf = (code: string): Sex | null => (code === "M" || code === "F" ? code : null);

/** Whole years between a YYYY-MM-DD date of birth and the Singapore date of `now`. */
export function ageInYears(dateOfBirth: string, now: Date): number {
  const [by, bm, bd] = dateOfBirth.split("-").map(Number) as [number, number, number];
  const [ty, tm, td] = cycleOf(now).split("-").map(Number) as [number, number, number];
  const hadBirthday = tm > bm || (tm === bm && td >= bd);
  return ty - by - (hadBirthday ? 0 : 1);
}

function ageBandOf(age: number): AgeBand {
  if (age < ADULT_AGE) return "<18";
  if (age < 20) return "<20";
  if (age >= 60) return "60+";
  return `${Math.floor(age / 10) * 10}s` as AgeBand;
}

/** A User's Byline as of `now`: the age band moves with their birthdays. */
export function bylineOf(user: { initials: string; sex: string | null; dateOfBirth: string }, now: Date): Byline {
  const age = ageInYears(user.dateOfBirth, now);
  return {
    initials: age < ADULT_AGE || user.initials === "" ? null : user.initials,
    sex: user.sex === null ? null : sexOf(user.sex),
    ageBand: ageBandOf(age),
  };
}

/** A Byline as it reads: "TA · M · 30s". */
export const bylineText = (byline: Byline): string => [byline.initials, byline.sex, byline.ageBand].filter(Boolean).join(" · ");
