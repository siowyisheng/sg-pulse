import { asc, eq } from "drizzle-orm";
import type { Db } from "@/db";
import { schema } from "@/db";
import { bylineOf, bylineText, type Byline } from "./byline";
import { cycleOf, type Cycle } from "./cycle";
import { AdminError } from "./errors";
import { createFeelings, type FeelingInput, type FeelingsOfTheDay, type MyFeeling, type ScheduledSeedFeeling, type SeedFeelingInput, type Submission } from "./feelings";
import type { Polarity } from "./feeling-rules";
import type { Clock, Singpass, WebPush } from "./ports";
import { createSessions, type Session } from "./sessions";
import { createSingpassLogins } from "./singpass-logins";

export type { Session };
export type { FeelingOfTheDay, FeelingsOfTheDay, FeelingState, MyFeeling, ScheduledSeedFeeling, Submission } from "./feelings";

/** What only an Admin may do. */
export interface Admin {
  /** Writes a Seed Feeling and makes it a Cycle's Feeling of the Day, shown as "From the team". */
  scheduleSeedFeeling(input: SeedFeelingInput): Promise<void>;
  /** Seed Feelings scheduled for today's Cycle and later, soonest first. */
  scheduledSeedFeelings(): Promise<ScheduledSeedFeeling[]>;
  /** Takes back a Seed Feeling whose Cycle has not started. */
  unscheduleSeedFeeling(input: { cycle: string; polarity: Polarity }): Promise<void>;
}

export interface AppDeps {
  db: Db;
  clock: Clock;
  /** Singpass login with Myinfo. */
  singpass: Singpass;
  /** Pushes to browsers whose User opted in. Nothing is sent yet. */
  webPush: WebPush;
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
}

/** How a trip to Singpass ended: a returning User is signed in; someone new must agree first. */
export type SingpassOutcome = { outcome: "signed-in"; session: Session } | { outcome: "consent-needed"; proof: string };

export type App = ReturnType<typeof createApp>;

/** The application: everything Yah Lah does, behind one interface. */
export function createApp({ db, clock, singpass }: AppDeps) {
  const sessions = createSessions({ db, clock });
  const logins = createSingpassLogins({ db, clock, singpass });
  const feelings = createFeelings({ db, clock });

  const admin: Admin = {
    scheduleSeedFeeling: (input) => feelings.scheduleSeed(input),
    scheduledSeedFeelings: () => feelings.scheduledSeeds(),
    unscheduleSeedFeeling: (input) => feelings.unscheduleSeed(input),
  };

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
          return admin;
        },
        submission: () => feelings.submission(userId),
        submitFeeling: (input) => feelings.submit(userId, input),
        myFeelings: () => feelings.mine(userId),
      };
    },

    signOut: (token: string) => sessions.end(token),

    /** The Cycle it is right now in Singapore. */
    currentCycle: (): Cycle => cycleOf(clock.now()),

    /** The Feelings of the Day for the Cycle it is right now in Singapore. Open to any Visitor. */
    feelingsOfTheDay: (): Promise<FeelingsOfTheDay> => feelings.ofTheDay(),

    /** The Hashtags of the Cycle under way, most used first, for a new Feeling to join. Open to any Visitor. */
    hashtagsInUse: (): Promise<string[]> => feelings.hashtagsInUse(),

    /**
     * For the operator's own scripts, which run with the database's credentials: nothing on the
     * site calls these.
     */
    operator: {
      scheduleSeedFeeling: (input: SeedFeelingInput) => feelings.scheduleSeed(input),

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
