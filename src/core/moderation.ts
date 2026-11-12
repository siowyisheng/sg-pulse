import { and, desc, eq, isNull, lte, max, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { schema } from "@/db";
import { bylineOf, type Byline } from "./byline";
import { cycleOf, nextCycle, type Cycle } from "./cycle";
import { ModerationError, ReportError } from "./errors";
import type { Polarity } from "./feeling-rules";
import type { Clock } from "./ports";

/** How long a Report judged innocent keeps its reporter from Reporting, unless the Admin says otherwise. */
export const DEFAULT_TIMEOUT_DAYS = 7;
export const MAX_NOTICE_CHARACTERS = 500;
const DAY_MS = 86_400_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A Feeling waiting in the Admin's queue. */
export interface ReportedFeeling {
  feelingId: string;
  text: string;
  hashtag: string;
  polarity: Polarity;
  byline: Byline;
  /** The Cycle it competes in. */
  cycle: Cycle;
  reportedAt: Date;
  yahLahs: number;
}

export type AuditAction = "report" | "report-cleared" | "take-down" | "correction-notice" | "approve" | "approval-withdrawn" | "seed-scheduled" | "seed-unscheduled";

export interface AuditEntry {
  at: Date;
  /** The User who did it, if they still exist. */
  actorId: string | null;
  action: AuditAction;
  feelingId: string | null;
  detail: string | null;
}

/** The moment a Cycle closes: 00:00 SGT at the start of the next day. */
const closeOf = (cycle: Cycle) => new Date(`${nextCycle(cycle)}T00:00:00+08:00`);

/** Reports, Take-downs, Timeouts, correction notices, and the record of all of them. */
export function createModeration({ db, clock }: { db: Db; clock: Clock }) {
  async function record(actorId: string | null, action: AuditAction, feelingId: string | null, detail: string | null = null) {
    await db.insert(schema.auditLog).values({ at: clock.now(), actorId, action, feelingId, detail });
  }

  const noSuchFeeling = () => new ModerationError("NO_SUCH_FEELING", "There is no such Feeling.");

  return {
    record,

    /** The newest entries of the audit log. */
    async auditLog(limit = 100): Promise<AuditEntry[]> {
      const rows = await db.select().from(schema.auditLog).orderBy(desc(schema.auditLog.id)).limit(limit);
      return rows.map(({ at, actorId, action, feelingId, detail }) => ({ at, actorId, action: action as AuditAction, feelingId, detail }));
    },

    /**
     * A User's Report: the Candidate is hidden from browsing at once and queued for an Admin. Its
     * Upvotes stay. If it was approved for tomorrow the Approval is void, since a Feeling under
     * review can't win.
     */
    async report(reporter: { id: string; reportingTimedOutUntil: Date | null }, feelingId: string): Promise<void> {
      const now = clock.now();
      const cycle = cycleOf(now);
      if (reporter.reportingTimedOutUntil && reporter.reportingTimedOutUntil > now) {
        throw new ReportError("TIMED_OUT", "You can't Report for now, because a Feeling you Reported earlier was found to be fine.");
      }
      const notACandidate = () => new ReportError("NOT_A_CANDIDATE", "That Feeling can no longer be Reported. Refresh to see today's.");
      if (typeof feelingId !== "string" || !UUID.test(feelingId)) throw notACandidate();
      const hidden = await db
        .update(schema.feelings)
        .set({ reportedAt: now })
        .where(
          and(
            eq(schema.feelings.id, feelingId),
            eq(schema.feelings.cycle, cycle),
            sql`${schema.feelings.submitterId} IS NOT NULL AND ${schema.feelings.submitterId} <> ${reporter.id}::uuid`,
            isNull(schema.feelings.removedAt),
            isNull(schema.feelings.reportedAt),
          ),
        )
        .returning({ id: schema.feelings.id });
      if (hidden.length === 0) {
        const [feeling] = await db.select().from(schema.feelings).where(eq(schema.feelings.id, feelingId));
        if (feeling?.cycle === cycle && feeling.submitterId === reporter.id) throw new ReportError("OWN_FEELING", "That's your own Feeling.");
        // Already under review: someone else got there first, and one Report is enough.
        if (feeling?.cycle === cycle && feeling.reportedAt && !feeling.removedAt) return;
        throw notACandidate();
      }
      await db.insert(schema.reports).values({ feelingId, reporterId: reporter.id, createdAt: now });
      await db.delete(schema.feelingsOfTheDay).where(and(eq(schema.feelingsOfTheDay.feelingId, feelingId), eq(schema.feelingsOfTheDay.cycle, nextCycle(cycle))));
      await record(reporter.id, "report", feelingId);
    },

    /** The Admin's queue: Feelings with an open Report, oldest first. */
    async reports(): Promise<ReportedFeeling[]> {
      const now = clock.now();
      const rows = await db
        .select({
          feelingId: schema.feelings.id,
          text: schema.feelings.text,
          hashtag: schema.feelings.hashtag,
          polarity: schema.feelings.polarity,
          cycle: schema.feelings.cycle,
          reportedAt: schema.reports.createdAt,
          submitter: schema.users,
          yahLahs: sql<number>`(SELECT count(*)::int FROM ${schema.upvotes} WHERE ${schema.upvotes.feelingId} = ${schema.feelings.id})`,
        })
        .from(schema.reports)
        .innerJoin(schema.feelings, eq(schema.feelings.id, schema.reports.feelingId))
        .innerJoin(schema.users, eq(schema.users.id, schema.feelings.submitterId))
        .where(isNull(schema.reports.outcome))
        .orderBy(schema.reports.createdAt);
      return rows.map(({ submitter, cycle, ...row }) => ({ ...row, cycle: cycle!, byline: bylineOf(submitter, now) }));
    },

    /**
     * The Admin finds a Reported Feeling innocent: it returns to the pool (if its Cycle is still open),
     * and the reporter gets a Timeout from Reporting, a week unless told otherwise; 0 days waives it.
     */
    async clearReport(adminId: string, feelingId: string, options: { timeoutDays?: number } = {}): Promise<void> {
      const now = clock.now();
      const open = UUID.test(String(feelingId))
        ? await db
            .update(schema.reports)
            .set({ outcome: "innocent", resolvedAt: now })
            .where(and(eq(schema.reports.feelingId, feelingId), isNull(schema.reports.outcome)))
            .returning({ reporterId: schema.reports.reporterId })
        : [];
      if (open.length === 0) throw new ModerationError("NOT_REPORTED", "That Feeling has no open Report.");
      await db.update(schema.feelings).set({ reportedAt: null }).where(eq(schema.feelings.id, feelingId));
      const days = Math.min(Math.max(0, options.timeoutDays ?? DEFAULT_TIMEOUT_DAYS), 365);
      const reporterId = open[0]!.reporterId;
      if (days > 0 && reporterId) {
        await db
          .update(schema.users)
          .set({ reportingTimedOutUntil: new Date(now.getTime() + days * DAY_MS) })
          .where(eq(schema.users.id, reporterId));
      }
      await record(adminId, "report-cleared", feelingId, days > 0 ? `Timeout of ${days} day${days === 1 ? "" : "s"}` : "No Timeout");
    },

    /**
     * Take-down: the Admin removes a Feeling for good, whether a Candidate or one that has been
     * published. Where it was the Feeling of the Day now showing, the next most-upvoted Feeling of
     * its Cycle takes its place, and failing that the Carry-over does. An Approval not yet live is
     * simply withdrawn, for the Admin to choose again. Any open Report on it is settled.
     */
    async takeDown(adminId: string, feelingId: string): Promise<void> {
      const now = clock.now();
      const today = cycleOf(now);
      if (typeof feelingId !== "string" || !UUID.test(feelingId)) throw noSuchFeeling();
      const [feeling] = await db.select().from(schema.feelings).where(eq(schema.feelings.id, feelingId));
      if (!feeling) throw noSuchFeeling();
      await db.update(schema.feelings).set({ removedAt: now }).where(and(eq(schema.feelings.id, feelingId), isNull(schema.feelings.removedAt)));
      await db
        .update(schema.reports)
        .set({ outcome: "removed", resolvedAt: now })
        .where(and(eq(schema.reports.feelingId, feelingId), isNull(schema.reports.outcome)));

      const days = await db.select().from(schema.feelingsOfTheDay).where(eq(schema.feelingsOfTheDay.feelingId, feelingId));
      for (const day of days) {
        const [showing] = await db
          .select({ cycle: max(schema.feelingsOfTheDay.cycle) })
          .from(schema.feelingsOfTheDay)
          .where(and(eq(schema.feelingsOfTheDay.polarity, day.polarity), lte(schema.feelingsOfTheDay.cycle, today)));
        const isShowingNow = day.cycle === showing?.cycle;
        const successor = isShowingNow && feeling.cycle ? await nextMostUpvoted(feeling.cycle, day.polarity) : undefined;
        const thisDay = and(eq(schema.feelingsOfTheDay.cycle, day.cycle), eq(schema.feelingsOfTheDay.polarity, day.polarity));
        if (successor) await db.update(schema.feelingsOfTheDay).set({ feelingId: successor }).where(thisDay);
        else await db.delete(schema.feelingsOfTheDay).where(thisDay);
      }
      await record(adminId, "take-down", feelingId);
    },

    /** Attaches a notice to a Feeling, shown wherever it is published; an empty notice lifts it. */
    async setCorrectionNotice(adminId: string, feelingId: string, notice: string): Promise<void> {
      const text = String(notice ?? "").replace(/\s+/gu, " ").trim();
      if (text.length > MAX_NOTICE_CHARACTERS) throw new ModerationError("NOTICE_TOO_LONG", `Keep the notice to ${MAX_NOTICE_CHARACTERS} characters.`);
      const changed =
        typeof feelingId === "string" && UUID.test(feelingId)
          ? await db
              .update(schema.feelings)
              .set({ correctionNotice: text === "" ? null : text })
              .where(eq(schema.feelings.id, feelingId))
              .returning({ id: schema.feelings.id })
          : [];
      if (changed.length === 0) throw noSuchFeeling();
      await record(adminId, "correction-notice", feelingId, text === "" ? "Lifted" : text);
    },
  };

  /**
   * The Feeling that takes a removed winner's place: the most upvoted of the same Cycle and Polarity
   * that is still standing, has never been a Feeling of the Day, and was not under review when the
   * Cycle closed (one cleared after the close is not crowned retroactively).
   */
  async function nextMostUpvoted(cycle: Cycle, polarity: Polarity): Promise<string | undefined> {
    const close = closeOf(cycle).toISOString();
    const found = await db.execute(sql`
      SELECT feeling.id
      FROM ${schema.feelings} AS feeling
      WHERE feeling.cycle = ${cycle}::date AND feeling.polarity = ${polarity}::polarity
        AND feeling.submitter_id IS NOT NULL AND feeling.removed_at IS NULL
        AND NOT EXISTS (SELECT 1 FROM ${schema.feelingsOfTheDay} AS chosen WHERE chosen.feeling_id = feeling.id)
        AND NOT EXISTS (
          SELECT 1 FROM ${schema.reports} AS report
          WHERE report.feeling_id = feeling.id AND report.created_at < ${close}::timestamptz
            AND (report.resolved_at IS NULL OR report.resolved_at >= ${close}::timestamptz)
        )
      ORDER BY (SELECT count(*) FROM ${schema.upvotes} AS upvote WHERE upvote.feeling_id = feeling.id) DESC, feeling.created_at ASC
      LIMIT 1
    `);
    return (found as unknown as { rows: { id: string }[] }).rows[0]?.id;
  }
}
