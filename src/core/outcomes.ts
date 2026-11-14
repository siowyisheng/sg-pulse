import { and, count, eq, isNull, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { schema } from "@/db";
import { cycleOf, previousCycle, type Cycle } from "./cycle";
import type { Polarity } from "./feeling-rules";
import type { Clock } from "./ports";

/**
 * How a User's part in the Cycle just closed went, told to them the morning after. Counts are hidden
 * until a Cycle closes; after that, one Feeling's count may be told to the person it concerns, and
 * only in these words. Nothing is told about a Feeling Reported or taken down, and nothing when the
 * count would be none.
 */

/** The Feeling that held a User's Yah Lah yesterday, and how many others chose it too. */
export interface YahLahOutcome {
  text: string;
  polarity: Polarity;
  hashtag: string;
  /** Other Users' Upvotes on it at the close: never 0 (then there is no outcome). */
  others: number;
  /** What the User is told. */
  line: string;
}

export const yahLahLine = (others: number) => (others === 1 ? "1 other chose the same Feeling as you yesterday" : `${others} others chose the same Feeling as you yesterday`);

/** The moment a Cycle closed: the start of the next Singapore day. */
const closeOf = (cycle: Cycle) => new Date(`${cycle}T00:00:00+08:00`).getTime() + 86_400_000;

/** No Report on the Feeling was open when the Cycle closed: made before then, and not settled by then. */
const notUnderReviewAtTheClose = (cycle: Cycle) => {
  const close = new Date(closeOf(cycle)).toISOString();
  return sql`NOT EXISTS (SELECT 1 FROM ${schema.reports} AS report WHERE report.feeling_id = ${schema.feelings.id} AND report.created_at < ${close}::timestamptz AND (report.resolved_at IS NULL OR report.resolved_at > ${close}::timestamptz))`;
};

export function createOutcomes({ db, clock }: { db: Db; clock: Clock }) {
  const yesterday = (): Cycle => previousCycle(cycleOf(clock.now()));

  return {
    /** How the User's Yah Lah in the Cycle just closed did, or null when there is nothing to tell. */
    async yahLah(userId: string): Promise<YahLahOutcome | null> {
      const cycle = yesterday();
      const [mine] = await db
        .select({ feelingId: schema.upvotes.feelingId, text: schema.feelings.text, polarity: schema.feelings.polarity, hashtag: schema.feelings.hashtag })
        .from(schema.upvotes)
        .innerJoin(schema.feelings, eq(schema.feelings.id, schema.upvotes.feelingId))
        .where(and(eq(schema.upvotes.userId, userId), eq(schema.upvotes.cycle, cycle), isNull(schema.feelings.removedAt), notUnderReviewAtTheClose(cycle)));
      if (!mine) return null;
      const [{ upvotes } = { upvotes: 0 }] = await db
        .select({ upvotes: count() })
        .from(schema.upvotes)
        .where(and(eq(schema.upvotes.feelingId, mine.feelingId), eq(schema.upvotes.cycle, cycle)));
      const others = upvotes - 1;
      if (others < 1) return null;
      const { feelingId: _feelingId, ...feeling } = mine;
      return { ...feeling, others, line: yahLahLine(others) };
    },
  };
}
