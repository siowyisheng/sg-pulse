import { and, eq, gte, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { schema } from "@/db";
import { bylineText, type Byline } from "./byline";
import { FeedbackError } from "./errors";
import type { Clock, Mailer } from "./ports";

export type FeedbackKind = "problem" | "suggestion";

export interface FeedbackInput {
  kind: FeedbackKind;
  message: string;
  /** Where the owner can answer, if the sender wants an answer. Used for this email only; never stored. */
  replyTo?: string;
  /** The page they were on, and their browser: what helps the owner act on it. */
  page?: string;
  browser?: string;
  /** A field no person sees. Only a bot fills it. */
  website?: string;
}

export const FEEDBACK_MAX_CHARACTERS = 1000;
/** How many a User may send in a day, counted in Singapore days. */
export const FEEDBACK_PER_DAY = 5;
const DAY_MS = 86_400_000;
const SGT_OFFSET_MS = 8 * 3_600_000;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SUBJECT_CHARACTERS = 60;

/**
 * Feedback from a User to the owner, by email. Nothing is kept but a line in the log saying a User
 * sent one that day, which also keeps them to a few a day. The text and the reply address are not stored.
 */
export function createFeedback({
  db,
  clock,
  mailer,
  to,
  record,
}: {
  db: Db;
  clock: Clock;
  mailer: Mailer;
  /** The owner's address. Null when feedback is switched off. */
  to: string | null;
  record: (actorId: string, action: "feedback", feelingId: null, detail: string) => Promise<void>;
}) {
  const singleLine = (text: string) => text.replace(/\s+/g, " ").trim();

  return {
    async send(userId: string, byline: Byline, input: FeedbackInput): Promise<void> {
      if (!to) throw new FeedbackError("NOT_OPEN", "Feedback isn't switched on yet.");
      if (input.kind !== "problem" && input.kind !== "suggestion") throw new FeedbackError("NO_KIND", "Choose Problem or Suggestion.");
      const message = String(input.message ?? "").trim();
      if (message === "") throw new FeedbackError("EMPTY", "Write your message first.");
      if ([...message].length > FEEDBACK_MAX_CHARACTERS) throw new FeedbackError("TOO_LONG", `Keep it to ${FEEDBACK_MAX_CHARACTERS} characters.`);
      const replyTo = String(input.replyTo ?? "").trim();
      if (replyTo !== "" && (!EMAIL.test(replyTo) || replyTo.length > 254)) throw new FeedbackError("BAD_REPLY_TO", "That doesn't look like an email address. You can leave it empty.");
      // A bot filled the field no person sees: it is told it worked, and nothing is sent.
      if (singleLine(String(input.website ?? "")) !== "") return;

      const now = clock.now();
      const dayStart = new Date(Math.floor((now.getTime() + SGT_OFFSET_MS) / DAY_MS) * DAY_MS - SGT_OFFSET_MS);
      const [counted] = await db
        .select({ sentToday: sql<number>`count(*)` })
        .from(schema.auditLog)
        .where(and(eq(schema.auditLog.actorId, userId), eq(schema.auditLog.action, "feedback"), gte(schema.auditLog.at, dayStart)));
      if (Number(counted?.sentToday ?? 0) >= FEEDBACK_PER_DAY) throw new FeedbackError("LIMIT", "That's enough feedback for today. Please try again tomorrow.");

      const firstLine = singleLine(message);
      const subjectTail = [...firstLine].length > SUBJECT_CHARACTERS ? `${[...firstLine].slice(0, SUBJECT_CHARACTERS).join("")}…` : firstLine;
      const lines = [message, "", "---"];
      if (input.page) lines.push(`Page: ${singleLine(input.page).slice(0, 200)}`);
      if (input.browser) lines.push(`Browser: ${singleLine(input.browser).slice(0, 200)}`);
      lines.push(`From: ${bylineText(byline)}`);
      if (replyTo !== "") lines.push(`Reply to: ${replyTo}`);

      try {
        await mailer.send({ to, subject: `Yah Lah ${input.kind}: ${subjectTail}`, text: lines.join("\n"), ...(replyTo !== "" ? { replyTo } : {}) });
      } catch (error) {
        console.error("Feedback couldn't be sent", error);
        throw new FeedbackError("NOT_SENT", "That didn't send. Please try again in a moment.");
      }
      await record(userId, "feedback", null, input.kind);
    },
  };
}
