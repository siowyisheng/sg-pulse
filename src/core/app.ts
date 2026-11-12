import { eq, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { schema } from "@/db";
import { bylineOf, type Byline } from "./byline";
import { cycleOf, isCycle, type Cycle } from "./cycle";
import { FeelingError } from "./errors";
import { normalisedHashtag, validText, type Polarity } from "./feeling-rules";
import type { Clock, Singpass, WebPush } from "./ports";
import { createSessions, type Session } from "./sessions";
import { createSingpassLogins } from "./singpass-logins";

export type { Session };

export interface AppDeps {
  db: Db;
  clock: Clock;
  /** Singpass login with Myinfo. */
  singpass: Singpass;
  /** Pushes to browsers whose User opted in. Nothing is sent yet. */
  webPush: WebPush;
}

/** A Feeling of the Day as a Visitor sees it. */
export interface FeelingOfTheDay {
  polarity: Polarity;
  text: string;
  /** Without the "#". */
  hashtag: string;
  /** A Seed Feeling: shown as "From the team", with no Byline. */
  fromTheTeam: boolean;
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

/** A signed-in User, and what they may see or do. */
export interface Me {
  /** What will show beside their Feelings, as of now. */
  byline: Byline;
  /** When they will have to log in again unless they visit before then. */
  sessionExpiresAt: Date;
}

/** How a trip to Singpass ended: a returning User is signed in; someone new must agree first. */
export type SingpassOutcome = { outcome: "signed-in"; session: Session } | { outcome: "consent-needed"; proof: string };

export type App = ReturnType<typeof createApp>;

/** The application: everything Yah Lah does, behind one interface. */
export function createApp({ db, clock, singpass }: AppDeps) {
  const sessions = createSessions({ db, clock });
  const logins = createSingpassLogins({ db, clock, singpass });

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
      return { byline: bylineOf(visit.user, clock.now()), sessionExpiresAt: visit.expiresAt };
    },

    signOut: (token: string) => sessions.end(token),

    /** The Feelings of the Day for the Cycle it is right now in Singapore. Open to any Visitor. */
    async feelingsOfTheDay(): Promise<FeelingsOfTheDay> {
      const cycle = cycleOf(clock.now());
      const rows = await db
        .select({
          polarity: schema.feelingsOfTheDay.polarity,
          text: schema.feelings.text,
          hashtag: schema.feelings.hashtag,
          fromTheTeam: schema.feelings.seed,
        })
        .from(schema.feelingsOfTheDay)
        .innerJoin(schema.feelings, eq(schema.feelings.id, schema.feelingsOfTheDay.feelingId))
        .where(eq(schema.feelingsOfTheDay.cycle, cycle));
      const of = (polarity: Polarity) => rows.find((row) => row.polarity === polarity) ?? null;
      return { cycle, good: of("good"), bad: of("bad") };
    },

    /**
     * Writes a Seed Feeling and makes it a Cycle's Feeling of the Day for its Polarity. For the team
     * only: nothing on the site calls this until the Admin area exists.
     */
    async addSeedFeelingOfTheDay(input: SeedFeelingInput): Promise<void> {
      if (!isCycle(input.cycle)) throw new FeelingError("INVALID_CYCLE", "A Cycle is a date, like 2026-11-12.");
      const text = validText(input.text);
      const hashtag = normalisedHashtag(input.hashtag);
      // One statement, so a Seed Feeling is never left behind without its day.
      const added = await db.execute(sql`
        WITH chosen AS (
          INSERT INTO ${schema.feelingsOfTheDay} (cycle, polarity, feeling_id)
          VALUES (${input.cycle}::date, ${input.polarity}::polarity, gen_random_uuid())
          ON CONFLICT DO NOTHING
          RETURNING feeling_id
        )
        INSERT INTO ${schema.feelings} (id, text, polarity, hashtag, seed, created_at)
        SELECT feeling_id, ${text}::text, ${input.polarity}::polarity, ${hashtag}::text, true, ${clock.now().toISOString()}::timestamptz FROM chosen
        RETURNING id
      `);
      if ((added as unknown as { rows: unknown[] }).rows.length === 0) {
        throw new FeelingError("ALREADY_CHOSEN", `${input.cycle} already has a ${input.polarity === "good" ? "Good" : "Bad"} Feeling of the Day.`);
      }
    },
  };
}
