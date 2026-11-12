import { boolean, date, index, jsonb, pgEnum, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid, type AnyPgColumn } from "drizzle-orm/pg-core";

export const polarity = pgEnum("polarity", ["good", "bad"]);

/** A Feeling. A Seed Feeling is written by the team and has no Submitter and no Cycle of its own. */
export const feelings = pgTable(
  "feelings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    text: text("text").notNull(),
    polarity: polarity("polarity").notNull(),
    /** Normalised: lowercase, no "#". */
    hashtag: text("hashtag").notNull(),
    seed: boolean("seed").notNull().default(false),
    submitterId: uuid("submitter_id").references((): AnyPgColumn => users.id),
    /** The Cycle a submitted Feeling competes in: its Submitter's one Feeling for that Cycle. */
    cycle: date("cycle", { mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [uniqueIndex("feelings_one_per_submitter_per_cycle").on(table.submitterId, table.cycle)],
);

/** The Good and the Bad Feeling of the Day for each Cycle (a Singapore calendar date). */
export const feelingsOfTheDay = pgTable(
  "feelings_of_the_day",
  {
    cycle: date("cycle", { mode: "string" }).notNull(),
    polarity: polarity("polarity").notNull(),
    feelingId: uuid("feeling_id")
      .notNull()
      .references(() => feelings.id),
  },
  (table) => [primaryKey({ columns: [table.cycle, table.polarity] })],
);

/**
 * A Singpass-verified person. Only what a Byline needs is kept: never the full name, and never the
 * NRIC or FIN.
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** Singpass's identifier for the person (a UUID). */
  singpassSubject: text("singpass_subject").notNull().unique(),
  initials: text("initials").notNull(),
  /** "M" or "F"; null when Myinfo records it as unknown. */
  sex: text("sex"),
  dateOfBirth: date("date_of_birth", { mode: "string" }).notNull(),
  /** The operator of the site. Set by hand (npm run admin), never from the site itself. */
  isAdmin: boolean("is_admin").notNull().default(false),
  /** When they agreed to what becomes public. */
  consentedAt: timestamp("consented_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

export const sessions = pgTable("sessions", {
  /** A hash of what the browser keeps. */
  tokenHash: text("token_hash").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

/** Who a finished Singpass login was for, kept only until they agree or the login runs out. */
export interface PendingPerson {
  subject: string;
  initials: string;
  sex: string | null;
  dateOfBirth: string;
}

/** One round trip to Singpass, from being sent there to agreeing to join. */
export const singpassLogins = pgTable("singpass_logins", {
  id: uuid("id").primaryKey().defaultRandom(),
  stateHash: text("state_hash").notNull().unique(),
  nonce: text("nonce").notNull(),
  codeVerifier: text("code_verifier").notNull(),
  /** Whatever the Singpass adapter needs back to finish this login. */
  adapterState: text("adapter_state"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  /** A hash of the one-use proof a new person holds while they read the consent screen. */
  proofHash: text("proof_hash").unique(),
  person: jsonb("person").$type<PendingPerson>(),
});

/**
 * A User's one Upvote in a Cycle, across both Polarities. Moving it rewrites the row; undoing it
 * removes the row. Once the Cycle has passed it is never touched again.
 */
export const upvotes = pgTable(
  "upvotes",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    cycle: date("cycle", { mode: "string" }).notNull(),
    feelingId: uuid("feeling_id")
      .notNull()
      .references(() => feelings.id, { onDelete: "cascade" }),
    /** When it was last cast or moved. */
    castAt: timestamp("cast_at", { withTimezone: true }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.cycle] }), index("upvotes_by_feeling").on(table.feelingId)],
);
