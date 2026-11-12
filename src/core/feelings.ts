import { and, asc, count, desc, eq, gte, inArray, isNotNull, isNull, lt, lte, sql, type SQL } from "drizzle-orm";
import type { Db } from "@/db";
import { schema } from "@/db";
import { bylineOf, type Byline } from "./byline";
import { byRank, CANDIDATES_SHOWN, mixOf, RISING_HALF_LIFE_HOURS } from "./candidate-mix";
import { cycleOf, isCycle, nextCycle, submissionCycleOf, type Cycle } from "./cycle";
import { ApprovalError, FeelingError, UpvoteError } from "./errors";
import { normalisedHashtag, refuseLinks, validPolarity, validText, type Polarity } from "./feeling-rules";
import type { Clock, Random } from "./ports";
import { isProfane } from "./profanity";

/** A Feeling that has been a Feeling of the Day, as anyone sees it: on the front page, in the archive, on its share page. */
export interface PublishedFeeling {
  id: string;
  /** The day it became the Feeling of the Day. */
  cycle: Cycle;
  polarity: Polarity;
  text: string;
  /** Without the "#". */
  hashtag: string;
  /** A Seed Feeling: shown as "From the team", with no Byline. */
  fromTheTeam: boolean;
  /** Its Submitter's Byline; null for a Seed Feeling. */
  byline: Byline | null;
  /** How many said Yah Lah to it in the Cycle it won: final, and shown only now that it has won. Null for a Seed Feeling. */
  yahLahs: number | null;
  /** A notice the Admin has attached to it, if any. */
  correctionNotice: string | null;
}

/** A Feeling of the Day as a Visitor sees it. */
export interface FeelingOfTheDay extends PublishedFeeling {
  /** A Carry-over: nothing was approved for today, so an earlier day's Feeling is "still feeling it". */
  carriedOver: boolean;
}

/** All a share preview may show: never the Byline or a count. */
export interface SharePreview {
  text: string;
  hashtag: string;
  polarity: Polarity;
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
 * Cycle under way, hidden while a Report on it is under review, removed by an Admin, a winner (a
 * Feeling of the Day), or expired with its Cycle.
 */
export type FeelingState = "queued" | "candidate" | "under-review" | "removed" | "expired" | "winner";

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

/** One of the top three the Admin may approve. The Admin, alone, sees counts while voting is open. */
export interface ApprovalChoice {
  id: string;
  text: string;
  hashtag: string;
  byline: Byline;
  yahLahs: number;
}

/** What the Admin approves from: the Cycle under way, and for each Polarity its top three and the one approved so far. */
export interface ApprovalChoices {
  cycle: Cycle;
  /** The day the approved Feelings go live, at 00:00 SGT. */
  goesLive: Cycle;
  good: { choices: ApprovalChoice[]; approvedId: string | null };
  bad: { choices: ApprovalChoice[]; approvedId: string | null };
}

export { CANDIDATES_SHOWN };
const CLOUD_SIZES = 5;
const ARCHIVE_DAYS_PER_PAGE = 14;
const CHOICES_OFFERED = 3;

const POLARITY_WORDS = { good: "Good", bad: "Bad" } as const;

export function createFeelings({ db, clock, random }: { db: Db; clock: Clock; random: Random }) {
  const today = () => cycleOf(clock.now());

  /** What makes a Feeling a Candidate anyone can see: written by a User for this Cycle, not removed, and not under review. */
  const inPool = (cycle: Cycle) =>
    and(eq(schema.feelings.cycle, cycle), isNotNull(schema.feelings.submitterId), isNull(schema.feelings.removedAt), isNull(schema.feelings.reportedAt));

  /** Feelings of the Day matching a condition, newest day first and Good before Bad, as anyone sees them. */
  async function published(condition: SQL | undefined, now: Date): Promise<PublishedFeeling[]> {
    const rows = await db
      .select({
        id: schema.feelings.id,
        cycle: schema.feelingsOfTheDay.cycle,
        polarity: schema.feelingsOfTheDay.polarity,
        text: schema.feelings.text,
        hashtag: schema.feelings.hashtag,
        fromTheTeam: schema.feelings.seed,
        correctionNotice: schema.feelings.correctionNotice,
        submitter: schema.users,
      })
      .from(schema.feelingsOfTheDay)
      .innerJoin(schema.feelings, eq(schema.feelings.id, schema.feelingsOfTheDay.feelingId))
      .leftJoin(schema.users, eq(schema.users.id, schema.feelings.submitterId))
      .where(and(condition, isNull(schema.feelings.removedAt)))
      .orderBy(desc(schema.feelingsOfTheDay.cycle), asc(schema.feelingsOfTheDay.polarity));
    const counted =
      rows.length === 0
        ? []
        : await db
            .select({ feelingId: schema.upvotes.feelingId, yahLahs: count() })
            .from(schema.upvotes)
            .where(inArray(schema.upvotes.feelingId, rows.map((row) => row.id)))
            .groupBy(schema.upvotes.feelingId);
    return rows.map(({ submitter, ...row }) => ({
      ...row,
      byline: submitter ? bylineOf(submitter, now) : null,
      yahLahs: submitter ? (counted.find((found) => found.feelingId === row.id)?.yahLahs ?? 0) : null,
    }));
  }

  /** The Cycle's Candidates for a Polarity (and Hashtag, if given), each with its Submitter and its Upvotes so far. */
  async function candidatesWithUpvotes(now: Date, polarity: Polarity, hashtag?: string) {
    const upvotes = count(schema.upvotes.userId);
    return db
      .select({
        id: schema.feelings.id,
        text: schema.feelings.text,
        polarity: schema.feelings.polarity,
        hashtag: schema.feelings.hashtag,
        createdAt: schema.feelings.createdAt,
        risingScore: schema.feelings.risingScore,
        risingAt: schema.feelings.risingAt,
        submitter: schema.users,
        upvotes,
      })
      .from(schema.feelings)
      .innerJoin(schema.users, eq(schema.users.id, schema.feelings.submitterId))
      .leftJoin(schema.upvotes, eq(schema.upvotes.feelingId, schema.feelings.id))
      .where(and(inPool(cycleOf(now)), eq(schema.feelings.polarity, polarity), hashtag === undefined ? undefined : eq(schema.feelings.hashtag, hashtag)))
      .groupBy(schema.feelings.id, schema.users.id)
      // A steady order to start from, so a jumble depends on the dice alone.
      .orderBy(asc(schema.feelings.createdAt), asc(schema.feelings.id));
  }

  /** The top three of a Polarity right now: most Upvotes, ties to the earliest written. */
  async function choicesFor(now: Date, polarity: Polarity): Promise<ApprovalChoice[]> {
    const ranked = (await candidatesWithUpvotes(now, polarity)).sort(byRank).slice(0, CHOICES_OFFERED);
    return ranked.map((candidate) => ({ id: candidate.id, text: candidate.text, hashtag: candidate.hashtag, byline: bylineOf(candidate.submitter, now), yahLahs: candidate.upvotes }));
  }

  function stateOf(cycle: Cycle, isWinner: boolean): FeelingState {
    if (isWinner) return "winner";
    if (cycle > today()) return "queued";
    return cycle === today() ? "candidate" : "expired";
  }

  return {
    /**
     * The Feelings of the Day for the Cycle it is right now in Singapore: for each Polarity the one
     * chosen for today, or failing that the most recent one before it, as a Carry-over.
     */
    async ofTheDay(): Promise<FeelingsOfTheDay> {
      const now = clock.now();
      const cycle = cycleOf(now);
      const latest = (polarity: Polarity) =>
        db
          .select({ cycle: sql<string>`max(${schema.feelingsOfTheDay.cycle})` })
          .from(schema.feelingsOfTheDay)
          .where(and(eq(schema.feelingsOfTheDay.polarity, polarity), lte(schema.feelingsOfTheDay.cycle, cycle)));
      const current = await published(
        sql`(${schema.feelingsOfTheDay.polarity} = 'good' AND ${schema.feelingsOfTheDay.cycle} = (${latest("good")})) OR (${schema.feelingsOfTheDay.polarity} = 'bad' AND ${schema.feelingsOfTheDay.cycle} = (${latest("bad")}))`,
        now,
      );
      const of = (polarity: Polarity): FeelingOfTheDay | null => {
        const feeling = current.find((found) => found.polarity === polarity);
        return feeling ? { ...feeling, carriedOver: feeling.cycle !== cycle } : null;
      };
      return { cycle, good: of("good"), bad: of("bad") };
    },

    /**
     * Past Feelings of the Day, newest day first and Good before Bad: `days` days of them, from before
     * `before` (or before today). Each Feeling is listed once, on the day it was chosen.
     */
    async archive(page: { before?: string; days?: number } = {}): Promise<PublishedFeeling[]> {
      const now = clock.now();
      const before = page.before === undefined ? cycleOf(now) : page.before;
      if (!isCycle(before)) return [];
      const until = before < cycleOf(now) ? before : cycleOf(now);
      const days = Math.min(Math.max(1, Math.floor(page.days ?? ARCHIVE_DAYS_PER_PAGE)), 60);
      const shown = await db
        .selectDistinct({ cycle: schema.feelingsOfTheDay.cycle })
        .from(schema.feelingsOfTheDay)
        .innerJoin(schema.feelings, eq(schema.feelings.id, schema.feelingsOfTheDay.feelingId))
        .where(and(lt(schema.feelingsOfTheDay.cycle, until), isNull(schema.feelings.removedAt)))
        .orderBy(desc(schema.feelingsOfTheDay.cycle))
        .limit(days);
      if (shown.length === 0) return [];
      return published(inArray(schema.feelingsOfTheDay.cycle, shown.map((row) => row.cycle)), now);
    },

    /** The Feeling of the Day chosen for a day and Polarity, once it has gone live. Candidates and Approvals not yet live are nobody's to see. */
    async publishedOn(cycle: string, polarity: Polarity): Promise<PublishedFeeling | null> {
      const now = clock.now();
      if (!isCycle(cycle) || cycle > cycleOf(now) || (polarity !== "good" && polarity !== "bad")) return null;
      const [feeling] = await published(and(eq(schema.feelingsOfTheDay.cycle, cycle), eq(schema.feelingsOfTheDay.polarity, polarity)), now);
      return feeling ?? null;
    },

    /** What the Admin approves from right now. */
    async approvalChoices(): Promise<ApprovalChoices> {
      const now = clock.now();
      const cycle = cycleOf(now);
      const goesLive = nextCycle(cycle);
      const [good, bad, approved] = await Promise.all([
        choicesFor(now, "good"),
        choicesFor(now, "bad"),
        db
          .select({ polarity: schema.feelingsOfTheDay.polarity, feelingId: schema.feelingsOfTheDay.feelingId })
          .from(schema.feelingsOfTheDay)
          .innerJoin(schema.feelings, eq(schema.feelings.id, schema.feelingsOfTheDay.feelingId))
          .where(and(eq(schema.feelingsOfTheDay.cycle, goesLive), eq(schema.feelings.seed, false))),
      ]);
      const approvedId = (polarity: Polarity) => approved.find((row) => row.polarity === polarity)?.feelingId ?? null;
      return { cycle, goesLive, good: { choices: good, approvedId: approvedId("good") }, bad: { choices: bad, approvedId: approvedId("bad") } };
    },

    /**
     * Approval: the Admin picks one of a Polarity's top three to be tomorrow's Feeling of the Day. It
     * goes live at 00:00 SGT; until then it can be changed. A Seed Feeling scheduled for that day gives way.
     */
    async approve(feelingId: string): Promise<void> {
      const now = clock.now();
      const goesLive = nextCycle(cycleOf(now));
      const notAChoice = () => new ApprovalError("NOT_A_CHOICE", "That Feeling isn't one of today's top three. Refresh to see the current ones.");
      if (typeof feelingId !== "string" || !UUID.test(feelingId)) throw notAChoice();
      let chosen: Polarity | undefined;
      for (const candidatePolarity of ["good", "bad"] as const) {
        if ((await choicesFor(now, candidatePolarity)).some((choice) => choice.id === feelingId)) chosen = candidatePolarity;
      }
      if (!chosen) throw notAChoice();
      const [before] = await db
        .select({ feelingId: schema.feelingsOfTheDay.feelingId, seed: schema.feelings.seed })
        .from(schema.feelingsOfTheDay)
        .innerJoin(schema.feelings, eq(schema.feelings.id, schema.feelingsOfTheDay.feelingId))
        .where(and(eq(schema.feelingsOfTheDay.cycle, goesLive), eq(schema.feelingsOfTheDay.polarity, chosen)));
      await db
        .insert(schema.feelingsOfTheDay)
        .values({ cycle: goesLive, polarity: chosen, feelingId })
        .onConflictDoUpdate({ target: [schema.feelingsOfTheDay.cycle, schema.feelingsOfTheDay.polarity], set: { feelingId } });
      // A Seed Feeling that gave way has no day left to show on.
      if (before?.seed) await db.delete(schema.feelings).where(and(eq(schema.feelings.id, before.feelingId), eq(schema.feelings.seed, true)));
    },

    /** Takes back the Approval for tomorrow, for one Polarity. What has already gone live stays. */
    async withdrawApproval(polarity: Polarity): Promise<void> {
      const goesLive = nextCycle(today());
      await db.execute(sql`
        DELETE FROM ${schema.feelingsOfTheDay} AS chosen
        USING ${schema.feelings} AS feeling
        WHERE chosen.cycle = ${goesLive}::date AND chosen.polarity = ${validPolarity(polarity)}::polarity
          AND feeling.id = chosen.feeling_id AND NOT feeling.seed
      `);
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
        .orderBy(asc(schema.feelingsOfTheDay.cycle), asc(schema.feelingsOfTheDay.polarity));
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
          reportedAt: schema.feelings.reportedAt,
          removedAt: schema.feelings.removedAt,
        })
        .from(schema.feelings)
        .leftJoin(schema.feelingsOfTheDay, eq(schema.feelingsOfTheDay.feelingId, schema.feelings.id))
        .where(and(eq(schema.feelings.submitterId, userId), isNotNull(schema.feelings.cycle)))
        .orderBy(desc(schema.feelings.cycle));
      // An Approval is nobody's business until it goes live.
      return rows.map(({ wonCycle, cycle, reportedAt, removedAt, ...feeling }) => {
        const state = removedAt ? "removed" : stateOf(cycle!, wonCycle !== null && wonCycle <= today());
        // Under review only matters while its Cycle is still open; after that it has simply expired.
        return { ...feeling, cycle: cycle!, state: reportedAt && !removedAt && (state === "candidate" || state === "queued") ? "under-review" : state };
      });
    },

    /** The Hashtags of the Cycle under way, most used first. Queued Feelings don't count until their Cycle starts. */
    async hashtagsInUse(): Promise<string[]> {
      const uses = count();
      const rows = await db
        .select({ hashtag: schema.feelings.hashtag, uses })
        .from(schema.feelings)
        .where(inPool(today()))
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
        .where(and(inPool(today()), eq(schema.feelings.polarity, polarity)))
        .groupBy(schema.feelings.hashtag)
        .orderBy(desc(uses), asc(schema.feelings.hashtag));
      const most = rows[0]?.feelings ?? 0;
      return rows.map((row) => ({ ...row, size: Math.max(1, Math.round((CLOUD_SIZES * row.feelings) / most)) as CloudWord["size"] }));
    },

    /**
     * Up to 10 of the Cycle's Candidates for a Polarity and Hashtag, jumbled: all of them when there
     * are 10 or fewer, otherwise a mix of the most upvoted, Rising and New (see candidate-mix.ts).
     */
    async candidates(input: { polarity: Polarity; hashtag: string }): Promise<(Candidate & { submitterId: string })[]> {
      if (input?.polarity !== "good" && input?.polarity !== "bad") return [];
      let hashtag: string;
      try {
        hashtag = normalisedHashtag(input.hashtag);
      } catch {
        return [];
      }
      const now = clock.now();
      const all = await candidatesWithUpvotes(now, input.polarity, hashtag);
      // What comes out says nothing of Upvotes, or of why a Candidate was picked.
      return mixOf(all, now, random).map(({ id, text, polarity, submitter }) => ({ id, text, polarity, hashtag, byline: bylineOf(submitter, now), submitterId: submitter.id }));
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
      // One statement: the check, the vote and the Candidate's freshness can't come apart, and two taps
      // at once leave one Upvote. Saying Yah Lah again to the Candidate that already has it changes nothing.
      const halfLifeSeconds = RISING_HALF_LIFE_HOURS * 3600;
      const cast = await db.execute(sql`
        WITH voted AS (
          INSERT INTO ${schema.upvotes} AS upvote (user_id, cycle, feeling_id, cast_at)
          SELECT ${userId}::uuid, ${cycle}::date, feeling.id, ${now.toISOString()}::timestamptz
          FROM ${schema.feelings} AS feeling
          WHERE feeling.id = ${feelingId}::uuid AND feeling.cycle = ${cycle}::date
            AND feeling.submitter_id IS NOT NULL AND feeling.submitter_id <> ${userId}::uuid
            AND feeling.removed_at IS NULL AND feeling.reported_at IS NULL
          ON CONFLICT (user_id, cycle) DO UPDATE SET feeling_id = EXCLUDED.feeling_id, cast_at = EXCLUDED.cast_at
            WHERE upvote.feeling_id <> EXCLUDED.feeling_id
          RETURNING feeling_id
        )
        UPDATE ${schema.feelings} AS feeling
        SET rising_score = feeling.rising_score * power(0.5, GREATEST(0, EXTRACT(EPOCH FROM (${now.toISOString()}::timestamptz - COALESCE(feeling.rising_at, ${now.toISOString()}::timestamptz)))) / ${halfLifeSeconds}::float8) + 1,
            rising_at = ${now.toISOString()}::timestamptz
        FROM voted WHERE feeling.id = voted.feeling_id
        RETURNING feeling.id
      `);
      if ((cast as unknown as { rows: unknown[] }).rows.length > 0) return;
      const [already] = await db
        .select({ feelingId: schema.upvotes.feelingId })
        .from(schema.upvotes)
        .where(and(eq(schema.upvotes.userId, userId), eq(schema.upvotes.cycle, cycle), eq(schema.upvotes.feelingId, feelingId)));
      if (already) return;
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
        .where(and(eq(schema.upvotes.userId, userId), eq(schema.upvotes.cycle, today()), isNull(schema.feelings.removedAt)));
      return mine ?? null;
    },

    /** Which Polarities have Candidates today but no Approval for tomorrow yet. */
    async awaitingApproval(): Promise<Polarity[]> {
      const choices = await this.approvalChoices();
      return (["good", "bad"] as const).filter((polarity) => choices[polarity].choices.length > 0 && choices[polarity].approvedId === null);
    },
  };
}
