import { asc, eq } from "drizzle-orm";
import type { Db } from "@/db";
import { schema } from "@/db";
import { bylineOf, bylineText, type Byline } from "./byline";
import { cycleOf, type Cycle } from "./cycle";
import { AdminError } from "./errors";
import { createModeration, type AuditEntry, type ReportedFeeling } from "./moderation";
import { createFeelings, type ApprovalChoices, type Candidate, type CloudWord, type FeelingInput, type MyCandidate, type MyUpvote, type FeelingsOfTheDay, type MyFeeling, type PublishedFeeling, type ScheduledSeedFeeling, type SharePreview, type SeedFeelingInput, type Submission } from "./feelings";
import type { Polarity } from "./feeling-rules";
import type { Clock, Random, Singpass, WebPush, WebPushSubscription } from "./ports";
import { createSessions, type Session } from "./sessions";
import { createSingpassLogins } from "./singpass-logins";

export type { Session };
export type { AuditEntry, ReportedFeeling } from "./moderation";
export type { ApprovalChoice, ApprovalChoices, Candidate, CloudWord, PublishedFeeling, SharePreview, MyCandidate, MyUpvote, FeelingOfTheDay, FeelingsOfTheDay, FeelingState, MyFeeling, ScheduledSeedFeeling, Submission } from "./feelings";

/** What only an Admin may do. */
export interface Admin {
  /** Writes a Seed Feeling and makes it a Cycle's Feeling of the Day, shown as "From the team". */
  scheduleSeedFeeling(input: SeedFeelingInput): Promise<void>;
  /** Seed Feelings scheduled for today's Cycle and later, soonest first. */
  scheduledSeedFeelings(): Promise<ScheduledSeedFeeling[]>;
  /** Takes back a Seed Feeling whose Cycle has not started. */
  unscheduleSeedFeeling(input: { cycle: string; polarity: Polarity }): Promise<void>;
  /** Today's top three Candidates for each Polarity, with their Upvotes so far, and what is approved for tomorrow. */
  approvalChoices(): Promise<ApprovalChoices>;
  /** Approval: makes one of a Polarity's top three tomorrow's Feeling of the Day, live at 00:00 SGT. Can be changed until then. */
  approve(feelingId: string): Promise<void>;
  /** Takes back tomorrow's Approval for a Polarity. */
  withdrawApproval(polarity: Polarity): Promise<void>;
  /** The queue of Feelings with an open Report, oldest first. */
  reports(): Promise<ReportedFeeling[]>;
  /** Finds a Reported Feeling innocent: it returns to the pool, and the reporter is timed out from Reporting (a week by default; 0 waives it). */
  clearReport(feelingId: string, options?: { timeoutDays?: number }): Promise<void>;
  /** Take-down: removes a Candidate or a published Feeling for good. The next most-upvoted, or the Carry-over, takes a published one's place. */
  takeDown(feelingId: string): Promise<void>;
  /** Attaches a correction notice to a Feeling, shown wherever it is published. An empty notice lifts it. */
  setCorrectionNotice(feelingId: string, notice: string): Promise<void>;
  /** The newest entries of the record of Reports and Admin actions. */
  auditLog(): Promise<AuditEntry[]>;
}

export interface AppDeps {
  db: Db;
  clock: Clock;
  /** Singpass login with Myinfo. */
  singpass: Singpass;
  /** Pushes to browsers whose User allowed them. */
  webPush: WebPush;
  /** The dice that jumble Candidates. Math.random unless given. */
  random?: Random;
}

/** A signed-in User, and what they may see or do. */
export interface Me {
  userId: string;
  /** What will show beside their Feelings, as of now. */
  byline: Byline;
  /** When they will have to log in again unless they visit before then. */
  sessionExpiresAt: Date;
  isAdmin: boolean;
  /** The Admin area. Throws for anyone who is not an Admin. */
  asAdmin(): Admin;
  /** Whether they can submit a Feeling now, and for which Cycle. */
  submission(): Promise<Submission>;
  /** Their one Feeling for a Cycle. It can't be edited or withdrawn afterwards. */
  submitFeeling(input: FeelingInput): Promise<MyFeeling>;
  /** Their own Feelings and where each stands, newest first. */
  myFeelings(): Promise<MyFeeling[]>;
  /** The Candidates under a Hashtag, as anyone sees them, plus which is theirs and which holds their Upvote. */
  candidates(input: { polarity: Polarity; hashtag: string }): Promise<MyCandidate[]>;
  /** Says Yah Lah: gives their one Upvote for the Cycle to a Candidate, moving it if it was elsewhere. */
  upvote(feelingId: string): Promise<void>;
  /** Takes their Upvote back. Possible until the Cycle ends. */
  undoUpvote(): Promise<void>;
  /** The Candidate holding their Upvote in the Cycle under way, if any. */
  myUpvote(): Promise<MyUpvote | null>;
  /** Reports a Candidate: it is hidden at once and queued for an Admin. */
  report(feelingId: string): Promise<void>;
  /** A Timeout: until then they can't Report (everything else still works). Null when they can. */
  reportingTimedOutUntil: Date | null;
  /** Lets this browser receive pushes for them. Saving the same browser again changes nothing. */
  subscribeToPush(subscription: WebPushSubscription): Promise<void>;
}

/** How a trip to Singpass ended: a returning User is signed in; someone new must agree first. */
export type SingpassOutcome = { outcome: "signed-in"; session: Session } | { outcome: "consent-needed"; proof: string };

export type App = ReturnType<typeof createApp>;

/** The application: everything Yah Lah does, behind one interface. */
export function createApp({ db, clock, singpass, webPush, random = Math.random }: AppDeps) {
  const sessions = createSessions({ db, clock });
  const logins = createSingpassLogins({ db, clock, singpass });
  const feelings = createFeelings({ db, clock, random });

  const moderation = createModeration({ db, clock });

  /** The Admin area, with everything done there recorded against the Admin who did it. */
  const adminFor = (adminId: string): Admin => ({
    async scheduleSeedFeeling(input) {
      await feelings.scheduleSeed(input);
      await moderation.record(adminId, "seed-scheduled", null, `${input.cycle} ${input.polarity}: ${input.text}`);
    },
    scheduledSeedFeelings: () => feelings.scheduledSeeds(),
    async unscheduleSeedFeeling(input) {
      await feelings.unscheduleSeed(input);
      await moderation.record(adminId, "seed-unscheduled", null, `${input.cycle} ${input.polarity}`);
    },
    approvalChoices: () => feelings.approvalChoices(),
    async approve(feelingId) {
      await feelings.approve(feelingId);
      await moderation.record(adminId, "approve", feelingId);
    },
    async withdrawApproval(polarity) {
      await feelings.withdrawApproval(polarity);
      await moderation.record(adminId, "approval-withdrawn", null, polarity);
    },
    reports: () => moderation.reports(),
    clearReport: (feelingId, options) => moderation.clearReport(adminId, feelingId, options),
    takeDown: (feelingId) => moderation.takeDown(adminId, feelingId),
    setCorrectionNotice: (feelingId, notice) => moderation.setCorrectionNotice(adminId, feelingId, notice),
    auditLog: () => moderation.auditLog(),
  });

  return {
    /** Starts a Singpass login: send the browser to `url`, and have it keep `state` for the way back. */
    startSingpass: () => logins.start(),

    /**
     * Finishes a Singpass login with what Singpass sent back. A User is signed in, with their
     * details brought up to date; someone new gets a proof to take to the consent screen.
     */
    async finishSingpass(input: { state: string; code: string; browserState: string | undefined }): Promise<SingpassOutcome> {
      const { loginId, person } = await logins.finish(input);
      const [user] = await db
        .update(schema.users)
        .set({ initials: person.initials, sex: person.sex, dateOfBirth: person.dateOfBirth })
        .where(eq(schema.users.singpassSubject, person.subject))
        .returning({ id: schema.users.id });
      if (user) return { outcome: "signed-in", session: await sessions.start(user.id) };
      return { outcome: "consent-needed", proof: await logins.holdForConsent(loginId, person) };
    },

    /** What the consent screen shows someone new: the Byline that would go beside their Feelings. */
    async consentPreview(proof: string): Promise<{ byline: Byline }> {
      return { byline: bylineOf(await logins.peek(proof), clock.now()) };
    },

    /** The person agrees to what becomes public: they become a User and are signed in. */
    async confirmConsent(proof: string): Promise<Session> {
      const person = await logins.claim(proof);
      const now = clock.now();
      // Agreeing twice (two tabs) is still one User.
      const [user] = await db
        .insert(schema.users)
        .values({ singpassSubject: person.subject, initials: person.initials, sex: person.sex, dateOfBirth: person.dateOfBirth, consentedAt: now, createdAt: now })
        .onConflictDoUpdate({ target: schema.users.singpassSubject, set: { initials: person.initials, sex: person.sex, dateOfBirth: person.dateOfBirth } })
        .returning({ id: schema.users.id });
      return sessions.start(user!.id);
    },

    /** The signed-in User a session token belongs to, if it is still running. Each call is a visit, which renews the session. */
    async authenticate(token: string): Promise<Me | undefined> {
      const visit = await sessions.visit(token);
      if (!visit) return undefined;
      const { id: userId, isAdmin } = visit.user;
      return {
        userId,
        byline: bylineOf(visit.user, clock.now()),
        sessionExpiresAt: visit.expiresAt,
        isAdmin,
        asAdmin() {
          if (!isAdmin) throw new AdminError("NOT_ADMIN", "This is for Admins only.");
          return adminFor(userId);
        },
        submission: () => feelings.submission(userId),
        submitFeeling: (input) => feelings.submit(userId, input),
        myFeelings: () => feelings.mine(userId),
        async candidates(input) {
          const [shown, upvote] = await Promise.all([feelings.candidates(input), feelings.myUpvote(userId)]);
          return shown.map(({ submitterId, ...candidate }) => ({ ...candidate, mine: submitterId === userId, hasMyUpvote: candidate.id === upvote?.feelingId }));
        },
        upvote: (feelingId) => feelings.upvote(userId, feelingId),
        undoUpvote: () => feelings.undoUpvote(userId),
        myUpvote: () => feelings.myUpvote(userId),
        report: (feelingId) => moderation.report(visit.user, feelingId),
        reportingTimedOutUntil: visit.user.reportingTimedOutUntil && visit.user.reportingTimedOutUntil > clock.now() ? visit.user.reportingTimedOutUntil : null,
        async subscribeToPush(subscription) {
          const { endpoint, p256dh, auth } = subscription;
          await db
            .insert(schema.pushSubscriptions)
            .values({ endpoint, p256dh, auth, userId, createdAt: clock.now() })
            .onConflictDoUpdate({ target: schema.pushSubscriptions.endpoint, set: { p256dh, auth, userId } });
        },
      };
    },

    signOut: (token: string) => sessions.end(token),

    /** The Cycle it is right now in Singapore. */
    currentCycle: (): Cycle => cycleOf(clock.now()),

    /** The Feelings of the Day for the Cycle it is right now in Singapore. Open to any Visitor. */
    feelingsOfTheDay: (): Promise<FeelingsOfTheDay> => feelings.ofTheDay(),

    /** Past Feelings of the Day, newest day first, a page of days at a time. Open to any Visitor. */
    archive: (page?: { before?: string; days?: number }): Promise<PublishedFeeling[]> => feelings.archive(page),

    /** The Feeling of the Day chosen for a day and Polarity, once it has gone live: what a share link opens. Open to any Visitor. */
    published: (cycle: string, polarity: Polarity): Promise<PublishedFeeling | null> => feelings.publishedOn(cycle, polarity),

    /** What a share link's preview image may show: the text, Hashtag, Polarity and whether it has been corrected, and nothing about who wrote it. */
    async sharePreview(cycle: string, polarity: Polarity): Promise<SharePreview | null> {
      const feeling = await feelings.publishedOn(cycle, polarity);
      return feeling ? { text: feeling.text, hashtag: feeling.hashtag, polarity: feeling.polarity, corrected: feeling.correctionNotice !== null } : null;
    },

    /** A Polarity's word cloud for the Cycle under way. Open to any Visitor. */
    wordCloud: (polarity: Polarity): Promise<CloudWord[]> => feelings.wordCloud(polarity),

    /** Up to 10 jumbled Candidates for a Polarity and Hashtag, with Bylines and no counts. Open to any Visitor. */
    async candidates(input: { polarity: Polarity; hashtag: string }): Promise<Candidate[]> {
      return (await feelings.candidates(input)).map(({ submitterId: _submitter, ...candidate }) => candidate);
    },

    /** The Hashtags of the Cycle under way, most used first, for a new Feeling to join. Open to any Visitor. */
    hashtagsInUse: (): Promise<string[]> => feelings.hashtagsInUse(),

    /**
     * For the operator's own scripts, which run with the database's credentials: nothing on the
     * site calls these.
     */
    operator: {
      scheduleSeedFeeling: (input: SeedFeelingInput) => feelings.scheduleSeed(input),

      /**
       * Reminds every Admin, on each browser they have allowed pushes on, when a Polarity with
       * Candidates has no Approval for tomorrow. Run by a daily job before midnight. Nothing depends
       * on it: without an Approval the Carry-over happens whether or not anyone was reminded.
       */
      async sendApprovalReminder(): Promise<{ sent: number }> {
        const waiting = await feelings.awaitingApproval();
        if (waiting.length === 0) return { sent: 0 };
        const body =
          waiting.length === 2 ? "The Good and Bad Feelings still need your Approval before midnight." : `The ${waiting[0] === "good" ? "Good" : "Bad"} Feeling still needs your Approval before midnight.`;
        const subscriptions = await db
          .select({ endpoint: schema.pushSubscriptions.endpoint, p256dh: schema.pushSubscriptions.p256dh, auth: schema.pushSubscriptions.auth })
          .from(schema.pushSubscriptions)
          .innerJoin(schema.users, eq(schema.users.id, schema.pushSubscriptions.userId))
          .where(eq(schema.users.isAdmin, true));
        let sent = 0;
        for (const subscription of subscriptions) {
          try {
            await webPush.send(subscription, { title: "Approve tomorrow's Feelings", body, link: "/admin" });
            sent++;
          } catch (error) {
            console.error("The Approval reminder couldn't be pushed", error);
          }
        }
        return { sent };
      },

      /** Every User, by Byline, to find the one to make an Admin. */
      async listUsers(): Promise<{ userId: string; byline: string; isAdmin: boolean; joinedAt: Date }[]> {
        const users = await db.select().from(schema.users).orderBy(asc(schema.users.createdAt));
        return users.map((user) => ({ userId: user.id, byline: bylineText(bylineOf(user, clock.now())), isAdmin: user.isAdmin, joinedAt: user.createdAt }));
      },

      /** Marks a User as an Admin. Returns false when there is no such User. */
      async makeAdmin(userId: string): Promise<boolean> {
        if (!/^[0-9a-f-]{36}$/i.test(userId)) return false;
        const marked = await db.update(schema.users).set({ isAdmin: true }).where(eq(schema.users.id, userId)).returning({ id: schema.users.id });
        return marked.length > 0;
      },
    },
  };
}
