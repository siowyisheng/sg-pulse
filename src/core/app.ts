import { eq, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { schema } from "@/db";
import { cycleOf, isCycle, type Cycle } from "./cycle";
import { FeelingError } from "./errors";
import { normalisedHashtag, validText, type Polarity } from "./feeling-rules";
import type { Clock, Singpass, WebPush } from "./ports";

export interface AppDeps {
  db: Db;
  clock: Clock;
  /** Singpass login with Myinfo. Nothing signs in yet; the port is here so sign-in plugs in without rewiring. */
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

export type App = ReturnType<typeof createApp>;

/** The application: everything Yah Lah does, behind one interface. */
export function createApp({ db, clock }: AppDeps) {
  return {
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
