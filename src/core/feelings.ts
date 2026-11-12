import { and, asc, count, desc, eq, gte, isNotNull, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { schema } from "@/db";
import { bylineOf, type Byline } from "./byline";
import { cycleOf, isCycle, submissionCycleOf, type Cycle } from "./cycle";
import { FeelingError, UpvoteError } from "./errors";
import { normalisedHashtag, refuseLinks, validPolarity, validText, type Polarity } from "./feeling-rules";
import type { Clock, Random } from "./ports";
import { isProfane } from "./profanity";

/** A Feeling of the Day as a Visitor sees it. */
export interface FeelingOfTheDay {
  polarity: Polarity;
  text: string;
  /** Without the "#". */
  hashtag: string;
  /** A Seed Feeling: shown as "From the team", with no Byline. */
  fromTheTeam: boolean;
  /** Its Submitter's Byline; null for a Seed Feeling. */
  byline: Byline | null;
}

export interface FeelingsOfTheDay {
  cycle: Cycle;
  /** Null when no Feeling of the Day was chosen for that Polarity. */
  good: FeelingOfTheDay | null;
  bad: FeelingOfTheDay | null;
}

export interface SeedFeelingInput {
  cycle: string;
  polarity: Polarity;
  text: string;
  hashtag: string;
}

/** A Seed Feeling set to be a Cycle's Feeling of the Day. */
export interface ScheduledSeedFeeling {
  cycle: Cycle;
  polarity: Polarity;
  text: string;
  hashtag: string;
  /** Its Cycle has started, so it is on the front page and can no longer be taken back. */
  live: boolean;
}

export interface FeelingInput {
  text: string;
  polarity: Polarity;
  hashtag: string;
}

/**
 * Where a Submitter's Feeling stands: queued for a Cycle that hasn't started, a Candidate of the
 * Cycle under way, a winner (a Feeling of the Day), or expired with its Cycle.
 */
export type FeelingState = "queued" | "candidate" | "expired" | "winner";

/** A Feeling as its own Submitter sees it. */
export interface MyFeeling {
  text: string;
  polarity: Polarity;
  hashtag: string;
  /** The Cycle it competes in. */
  cycle: Cycle;
  state: FeelingState;
}

/** What a User may do about submitting right now. */
export interface Submission {
  /** The Cycle a Feeling submitted now would compete in. */
  cycle: Cycle;
  /** False once they have a Feeling in that Cycle. */
  canSubmit: boolean;
  /** It is 21:00 SGT or later, so a Feeling submitted now is queued for tomorrow. */
  queued: boolean;
}

/** One Hashtag in a Polarity's word cloud. */
export interface CloudWord {
  hashtag: string;
  /** How many of the Cycle's Candidates use it. */
  feelings: number;
  /** 1 (smallest) to 5 (the most used), by its share of the most used Hashtag. */
  size: 1 | 2 | 3 | 4 | 5;
}

/** A Candidate as anyone browsing sees it. Never how many Upvotes it has. */
export interface Candidate {
  id: string;
  text: string;
  polarity: Polarity;
  hashtag: string;
  byline: Byline;
}

/** A Candidate as a signed-in User sees it: with their own marks, and still nothing about anyone else's. */
export interface MyCandidate extends Candidate {
  /** They wrote it, so they can't Upvote it. */
  mine: boolean;
  /** It holds their Upvote for this Cycle. */
  hasMyUpvote: boolean;
}

/** The Candidate holding a User's Upvote in the Cycle under way. */
export interface MyUpvote {
  feelingId: string;
  text: string;
  polarity: Polarity;
  hashtag: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** How many Candidates the Hashtag screen shows at once. */
export const CANDIDATES_SHOWN = 10;
const CLOUD_SIZES = 5;

const POLARITY_WORDS = { good: "Good", bad: "Bad" } as const;

export function createFeelings({ db, clock, random }: { db: Db; clock: Clock; random: Random }) {
  const today = () => cycleOf(clock.now());

  /** A jumbled copy, so position says nothing about popularity or age. */
  function jumbled<T>(items: T[]): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [copy[i], copy[j]] = [copy[j]!, copy[i]!];
    }
    return copy;
  }

  function stateOf(cycle: Cycle, isWinner: boolean): FeelingState {
    if (isWinner) return "winner";
    if (cycle > today()) return "queued";
    return cycle === today() ? "candidate" : "expired";
  }

  return {
    /** The Feelings of the Day for the Cycle it is right now in Singapore. */
    async ofTheDay(): Promise<FeelingsOfTheDay> {
      const cycle = today();
      const rows = await db
        .select({ polarity: schema.feelingsOfTheDay.polarity, text: schema.feelings.text, hashtag: schema.feelings.hashtag, fromTheTeam: schema.feelings.seed })
        .from(schema.feelingsOfTheDay)
        .innerJoin(schema.feelings, eq(schema.feelings.id, schema.feelingsOfTheDay.feelingId))
        .where(eq(schema.feelingsOfTheDay.cycle, cycle));
      const of = (polarity: Polarity) => {
        const row = rows.find((found) => found.polarity === polarity);
        return row ? { ...row, byline: null } : null;
      };
      return { cycle, good: of("good"), bad: of("bad") };
    },

    /** Writes a Seed Feeling and makes it a Cycle's Feeling of the Day for its Polarity, from today's Cycle on. */
    async scheduleSeed(input: SeedFeelingInput): Promise<void> {
      if (!isCycle(input.cycle)) throw new FeelingError("INVALID_CYCLE", "A Cycle is a date, like 2026-11-12.");
      if (input.cycle < today()) throw new FeelingError("CYCLE_PAST", "That day has passed.");
      const polarity = validPolarity(input.polarity);
      const text = validText(input.text);
      const hashtag = normalisedHashtag(input.hashtag);
      // One statement, so a Seed Feeling is never left behind without its day.
      const added = await db.execute(sql`
        WITH chosen AS (
          INSERT INTO ${schema.feelingsOfTheDay} (cycle, polarity, feeling_id)
          VALUES (${input.cycle}::date, ${polarity}::polarity, gen_random_uuid())
          ON CONFLICT DO NOTHING
          RETURNING feeling_id
        )
        INSERT INTO ${schema.feelings} (id, text, polarity, hashtag, seed, created_at)
        SELECT feeling_id, ${text}::text, ${polarity}::polarity, ${hashtag}::text, true, ${clock.now().toISOString()}::timestamptz FROM chosen
        RETURNING id
      `);
      if ((added as unknown as { rows: unknown[] }).rows.length === 0) {
        throw new FeelingError("ALREADY_CHOSEN", `${input.cycle} already has a ${POLARITY_WORDS[polarity]} Feeling of the Day.`);
      }
    },

    /** Seed Feelings scheduled for today's Cycle and later, soonest first. */
    async scheduledSeeds(): Promise<ScheduledSeedFeeling[]> {
      const cycle = today();
      const rows = await db
        .select({ cycle: schema.feelingsOfTheDay.cycle, polarity: schema.feelingsOfTheDay.polarity, text: schema.feelings.text, hashtag: schema.feelings.hashtag })
        .from(schema.feelingsOfTheDay)
        .innerJoin(schema.feelings, eq(schema.feelings.id, schema.feelingsOfTheDay.feelingId))
        .where(and(gte(schema.feelingsOfTheDay.cycle, cycle), eq(schema.feelings.seed, true)))
        .orderBy(asc(schema.feelingsOfTheDay.cycle), desc(schema.feelingsOfTheDay.polarity));
      return rows.map((row) => ({ ...row, live: row.cycle === cycle }));
    },

    /** Takes back a Seed Feeling whose Cycle has not started, so a mistake can be fixed. */
    async unscheduleSeed(input: { cycle: string; polarity: Polarity }): Promise<void> {
      if (!isCycle(input.cycle)) throw new FeelingError("INVALID_CYCLE", "A Cycle is a date, like 2026-11-12.");
      const polarity = validPolarity(input.polarity);
      if (input.cycle <= today()) throw new FeelingError("ALREADY_LIVE", "That Feeling of the Day is already live.");
      // One statement: the day's choice and the Seed Feeling it pointed at go together.
      await db.execute(sql`
        WITH unchosen AS (
          DELETE FROM ${schema.feelingsOfTheDay} AS chosen
          USING ${schema.feelings} AS feeling
          WHERE chosen.cycle = ${input.cycle}::date AND chosen.polarity = ${polarity}::polarity
            AND feeling.id = chosen.feeling_id AND feeling.seed
          RETURNING chosen.feeling_id
        )
        DELETE FROM ${schema.feelings} WHERE id IN (SELECT feeling_id FROM unchosen)
      `);
    },

    async submission(userId: string): Promise<Submission> {
      const now = clock.now();
      const cycle = submissionCycleOf(now);
      const [mine] = await db
        .select({ id: schema.feelings.id })
        .from(schema.feelings)
        .where(and(eq(schema.feelings.submitterId, userId), eq(schema.feelings.cycle, cycle)));
      return { cycle, canSubmit: !mine, queued: cycle !== cycleOf(now) };
    },

    /**
     * A User's one Feeling for a Cycle. Refused text (too long, a link, caught by the filter) leaves
     * the Cycle's submission unused. Once in, a Feeling can't be edited or withdrawn.
     */
    async submit(userId: string, input: FeelingInput): Promise<MyFeeling> {
      const now = clock.now();
      const polarity = validPolarity(input?.polarity);
      const text = validText(input?.text ?? "");
      const hashtag = normalisedHashtag(input?.hashtag ?? "");
      refuseLinks(text);
      if (isProfane(text) || isProfane(hashtag)) {
        throw new FeelingError("REFUSED_BY_FILTER", "That has a word we don't allow. Change it and try again; this hasn't used up your Feeling.");
      }
      const cycle = submissionCycleOf(now);
      // The unique index is what holds the line when two submissions race.
      const added = await db
        .insert(schema.feelings)
        .values({ text, polarity, hashtag, submitterId: userId, cycle, createdAt: now })
        .onConflictDoNothing({ target: [schema.feelings.submitterId, schema.feelings.cycle] })
        .returning({ id: schema.feelings.id });
      if (added.length === 0) {
        const queued = cycle !== cycleOf(now);
        throw new FeelingError("ALREADY_SUBMITTED", queued ? "You already have a Feeling queued for tomorrow." : "You've already submitted a Feeling today. You can write another after 9pm.");
      }
      return { text, polarity, hashtag, cycle, state: stateOf(cycle, false) };
    },

    /** A Submitter's own Feelings, newest Cycle first. */
    async mine(userId: string): Promise<MyFeeling[]> {
      const rows = await db
        .select({
          text: schema.feelings.text,
          polarity: schema.feelings.polarity,
          hashtag: schema.feelings.hashtag,
          cycle: schema.feelings.cycle,
          wonCycle: schema.feelingsOfTheDay.cycle,
        })
        .from(schema.feelings)
        .leftJoin(schema.feelingsOfTheDay, eq(schema.feelingsOfTheDay.feelingId, schema.feelings.id))
        .where(and(eq(schema.feelings.submitterId, userId), isNotNull(schema.feelings.cycle)))
        .orderBy(desc(schema.feelings.cycle));
      return rows.map(({ wonCycle, cycle, ...feeling }) => ({ ...feeling, cycle: cycle!, state: stateOf(cycle!, wonCycle !== null) }));
    },

    /** The Hashtags of the Cycle under way, most used first. Queued Feelings don't count until their Cycle starts. */
    async hashtagsInUse(): Promise<string[]> {
      const uses = count();
      const rows = await db
        .select({ hashtag: schema.feelings.hashtag, uses })
        .from(schema.feelings)
        .where(and(eq(schema.feelings.cycle, today()), isNotNull(schema.feelings.submitterId)))
        .groupBy(schema.feelings.hashtag)
        .orderBy(desc(uses), asc(schema.feelings.hashtag));
      return rows.map((row) => row.hashtag);
    },

    /**
     * A Polarity's word cloud: the Hashtags of the Cycle's Candidates, most used first, each sized by
     * how many Feelings use it.
     */
    async wordCloud(polarity: Polarity): Promise<CloudWord[]> {
      if (polarity !== "good" && polarity !== "bad") return [];
      const uses = count();
      const rows = await db
        .select({ hashtag: schema.feelings.hashtag, feelings: uses })
        .from(schema.feelings)
        .where(and(eq(schema.feelings.cycle, today()), eq(schema.feelings.polarity, polarity), isNotNull(schema.feelings.submitterId)))
        .groupBy(schema.feelings.hashtag)
        .orderBy(desc(uses), asc(schema.feelings.hashtag));
      const most = rows[0]?.feelings ?? 0;
      return rows.map((row) => ({ ...row, size: Math.max(1, Math.round((CLOUD_SIZES * row.feelings) / most)) as CloudWord["size"] }));
    },

    /** Up to 10 of the Cycle's Candidates for a Polarity and Hashtag, jumbled; all of them when there are 10 or fewer. */
    async candidates(input: { polarity: Polarity; hashtag: string }): Promise<(Candidate & { submitterId: string })[]> {
      if (input?.polarity !== "good" && input?.polarity !== "bad") return [];
      let hashtag: string;
      try {
        hashtag = normalisedHashtag(input.hashtag);
      } catch {
        return [];
      }
      const now = clock.now();
      const rows = await db
        .select({ id: schema.feelings.id, text: schema.feelings.text, polarity: schema.feelings.polarity, hashtag: schema.feelings.hashtag, submitter: schema.users })
        .from(schema.feelings)
        .innerJoin(schema.users, eq(schema.users.id, schema.feelings.submitterId))
        .where(and(eq(schema.feelings.cycle, cycleOf(now)), eq(schema.feelings.polarity, input.polarity), eq(schema.feelings.hashtag, hashtag)))
        // A steady order to jumble from, so the jumble depends on the dice alone.
        .orderBy(asc(schema.feelings.createdAt), asc(schema.feelings.id));
      return jumbled(rows)
        .slice(0, CANDIDATES_SHOWN)
        .map(({ submitter, ...feeling }) => ({ ...feeling, byline: bylineOf(submitter, now), submitterId: submitter.id }));
    },

    /**
     * Gives a User's one Upvote for the Cycle to a Candidate, moving it from wherever it was. Not to
     * their own Feeling, and only to a Candidate of the Cycle under way.
     */
    async upvote(userId: string, feelingId: string): Promise<void> {
      const now = clock.now();
      const cycle = cycleOf(now);
      const notACandidate = () => new UpvoteError("NOT_A_CANDIDATE", "Voting on that Feeling has closed. Refresh to see today's.");
      if (typeof feelingId !== "string" || !UUID.test(feelingId)) throw notACandidate();
      // One statement: the check and the vote can't come apart, and two taps at once leave one Upvote.
      const cast = await db.execute(sql`
        INSERT INTO ${schema.upvotes} (user_id, cycle, feeling_id, cast_at)
        SELECT ${userId}::uuid, ${cycle}::date, feeling.id, ${now.toISOString()}::timestamptz
        FROM ${schema.feelings} AS feeling
        WHERE feeling.id = ${feelingId}::uuid AND feeling.cycle = ${cycle}::date
          AND feeling.submitter_id IS NOT NULL AND feeling.submitter_id <> ${userId}::uuid
        ON CONFLICT (user_id, cycle) DO UPDATE SET feeling_id = EXCLUDED.feeling_id, cast_at = EXCLUDED.cast_at
        RETURNING feeling_id
      `);
      if ((cast as unknown as { rows: unknown[] }).rows.length > 0) return;
      const [own] = await db
        .select({ id: schema.feelings.id })
        .from(schema.feelings)
        .where(and(eq(schema.feelings.id, feelingId), eq(schema.feelings.submitterId, userId), eq(schema.feelings.cycle, cycle)));
      throw own ? new UpvoteError("OWN_FEELING", "That's your own Feeling, so you can't Yah Lah it.") : notACandidate();
    },

    /** Takes back a User's Upvote in the Cycle under way. Earlier Cycles' Upvotes stand. */
    async undoUpvote(userId: string): Promise<void> {
      await db.delete(schema.upvotes).where(and(eq(schema.upvotes.userId, userId), eq(schema.upvotes.cycle, today())));
    },

    /** The Candidate holding a User's Upvote in the Cycle under way, if any. */
    async myUpvote(userId: string): Promise<MyUpvote | null> {
      const [mine] = await db
        .select({ feelingId: schema.feelings.id, text: schema.feelings.text, polarity: schema.feelings.polarity, hashtag: schema.feelings.hashtag })
        .from(schema.upvotes)
        .innerJoin(schema.feelings, eq(schema.feelings.id, schema.upvotes.feelingId))
        .where(and(eq(schema.upvotes.userId, userId), eq(schema.upvotes.cycle, today())));
      return mine ?? null;
    },
  };
}
