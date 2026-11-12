import { eq, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { schema } from "@/db";
import { bylineOf, type Byline } from "./byline";
import { cycleOf } from "./cycle";
import { PrivacyError } from "./errors";
import type { Clock } from "./ports";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HOUR_MS = 3_600_000;
/** An Admin honours a request for removal within this long. */
export const REMOVAL_WITHIN_HOURS = 24;
/** How long the record of submissions, Reports and Admin actions is kept. */
export const LOG_KEPT_MONTHS = 12;

/** A request for removal still waiting for the Admin. */
export interface RemovalRequest {
  feelingId: string;
  text: string;
  hashtag: string;
  polarity: "good" | "bad";
  byline: Byline | null;
  /** The day it was published for. */
  cycle: string;
  requestedAt: Date;
  /** When the Admin is to have honoured it by. */
  dueBy: Date;
}

const rowsOf = (result: unknown) => (result as { rows: Record<string, unknown>[] }).rows;

/**
 * What a person may ask of us about their own data: that a published winner of theirs be removed,
 * and that their account be deleted. And the retention of the record of what has been done.
 */
export function createPrivacy({ db, clock }: { db: Db; clock: Clock }) {
  return {
    /**
     * Asks for one of the User's own published winners to be removed, archive entry included. The
     * Admin sees the request and has a day to honour it. Asking again changes nothing.
     */
    async requestRemoval(userId: string, feelingId: string): Promise<void> {
      const notYours = () => new PrivacyError("NOT_YOUR_WINNER", "You can only ask for removal of a Feeling of yours that has been a Feeling of the Day.");
      if (typeof feelingId !== "string" || !UUID.test(feelingId)) throw notYours();
      const when = clock.now().toISOString();
      const today = cycleOf(clock.now());
      // One statement, so the request and the record of it are both made or neither is.
      const result = await db.execute(sql`
        WITH asked AS (
          INSERT INTO ${schema.removalRequests} (feeling_id, requester_id, created_at)
          SELECT feeling.id, ${userId}::uuid, ${when}::timestamptz
          FROM ${schema.feelings} AS feeling
          WHERE feeling.id = ${feelingId}::uuid AND feeling.submitter_id = ${userId}::uuid AND feeling.removed_at IS NULL
            AND EXISTS (SELECT 1 FROM ${schema.feelingsOfTheDay} AS day WHERE day.feeling_id = feeling.id AND day.cycle <= ${today}::date)
            AND NOT EXISTS (SELECT 1 FROM ${schema.removalRequests} AS open WHERE open.feeling_id = feeling.id AND open.resolved_at IS NULL)
          RETURNING feeling_id
        ), recorded AS (
          INSERT INTO ${schema.auditLog} (at, actor_id, action, feeling_id)
          SELECT ${when}::timestamptz, ${userId}::uuid, 'removal-requested', feeling_id FROM asked RETURNING id
        )
        SELECT feeling_id FROM asked`);
      if (rowsOf(result).length > 0) return;
      const [mine] = await db
        .select({ open: sql<number>`(SELECT count(*) FROM ${schema.removalRequests} WHERE feeling_id = ${feelingId}::uuid AND resolved_at IS NULL)` })
        .from(schema.feelings)
        .where(sql`${schema.feelings.id} = ${feelingId}::uuid AND ${schema.feelings.submitterId} = ${userId}::uuid`);
      if (!mine || Number(mine.open) === 0) throw notYours();
    },

    /** Requests still waiting, the one that has waited longest first. */
    async removalRequests(): Promise<RemovalRequest[]> {
      const rows = await db
        .select({
          feelingId: schema.feelings.id,
          text: schema.feelings.text,
          hashtag: schema.feelings.hashtag,
          polarity: schema.feelings.polarity,
          snapshot: schema.feelings.bylineSnapshot,
          submitter: schema.users,
          cycle: sql<string>`(SELECT min(day.cycle) FROM ${schema.feelingsOfTheDay} AS day WHERE day.feeling_id = ${schema.feelings.id})`,
          requestedAt: schema.removalRequests.createdAt,
        })
        .from(schema.removalRequests)
        .innerJoin(schema.feelings, eq(schema.feelings.id, schema.removalRequests.feelingId))
        .leftJoin(schema.users, eq(schema.users.id, schema.feelings.submitterId))
        .where(sql`${schema.removalRequests.resolvedAt} IS NULL`)
        .orderBy(schema.removalRequests.createdAt);
      return rows.map(({ snapshot, submitter, requestedAt, ...row }) => ({
        ...row,
        byline: submitter ? bylineOf(submitter, clock.now()) : ((snapshot as Byline | null) ?? null),
        requestedAt,
        dueBy: new Date(requestedAt.getTime() + REMOVAL_WITHIN_HOURS * HOUR_MS),
      }));
    },

    /**
     * Deletes the User's account and what we hold on them: their details, sessions, Upvotes, push
     * subscriptions, and every Feeling of theirs that has not been published. One that has been a
     * Feeling of the Day stays, with the Byline it had, until removal is asked for separately. One
     * statement, so it is all done or not at all.
     */
    async deleteAccount(userId: string): Promise<void> {
      const now = clock.now();
      const when = now.toISOString();
      const today = cycleOf(now);
      const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId));
      if (!user) return;
      const byline = JSON.stringify(bylineOf(user, now));
      await db.execute(sql`
        WITH published AS (
          SELECT feeling.id FROM ${schema.feelings} AS feeling
          WHERE feeling.submitter_id = ${userId}::uuid
            AND EXISTS (SELECT 1 FROM ${schema.feelingsOfTheDay} AS day WHERE day.feeling_id = feeling.id AND day.cycle <= ${today}::date)
        ), kept AS (
          UPDATE ${schema.feelings} SET submitter_id = NULL, byline_snapshot = ${byline}::jsonb
          WHERE id IN (SELECT id FROM published) RETURNING id
        ), gone AS (
          DELETE FROM ${schema.feelingsOfTheDay} AS day WHERE day.feeling_id IN (SELECT id FROM ${schema.feelings} WHERE submitter_id = ${userId}::uuid AND id NOT IN (SELECT id FROM published))
          RETURNING day.feeling_id
        ), removed AS (
          DELETE FROM ${schema.feelings} WHERE submitter_id = ${userId}::uuid AND id NOT IN (SELECT id FROM published) RETURNING id
        ), recorded AS (
          INSERT INTO ${schema.auditLog} (at, actor_id, action, detail)
          SELECT ${when}::timestamptz, ${userId}::uuid, 'account-deleted', 'Account deleted' RETURNING id
        ), account AS (
          DELETE FROM ${schema.users} WHERE id = ${userId}::uuid RETURNING id
        )
        SELECT 1`);
    },

    /** Removes what the record holds of more than a year ago. */
    async purgeOldLogs(): Promise<{ removed: number }> {
      const result = await db.execute(sql`DELETE FROM ${schema.auditLog} WHERE at < ${clock.now().toISOString()}::timestamptz - make_interval(months => ${LOG_KEPT_MONTHS}) RETURNING id`);
      return { removed: rowsOf(result).length };
    },
  };
}
