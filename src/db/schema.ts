import { boolean, date, doublePrecision, index, integer, jsonb, pgEnum, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid, type AnyPgColumn } from "drizzle-orm/pg-core";

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
    /**
     * How fresh its Upvotes are: each Upvote it receives adds one, and the sum halves every few
     * hours. Touched only when an Upvote arrives; `risingAt` says how old the figure is.
     */
    risingScore: doublePrecision("rising_score").notNull().default(0),
    risingAt: timestamp("rising_at", { withTimezone: true }),
    /** Set while a Report on it is open: hidden from browsing until an Admin clears or removes it. */
    reportedAt: timestamp("reported_at", { withTimezone: true }),
    /** Taken down by an Admin: gone from everywhere, for good. */
    removedAt: timestamp("removed_at", { withTimezone: true }),
    /** A notice an Admin has attached, shown wherever the Feeling is published. */
    correctionNotice: text("correction_notice"),
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
  /** A Timeout: they can't Report until this moment. Nothing else is restricted. */
  reportingTimedOutUntil: timestamp("reporting_timed_out_until", { withTimezone: true }),
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

/** A browser a User has allowed to receive pushes. */
export const pushSubscriptions = pgTable("push_subscriptions", {
  endpoint: text("endpoint").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  /** The Cycle whose daily push this browser last received: one a day, however often the job runs. */
  lastPushedCycle: date("last_pushed_cycle", { mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

/** A User's flag that a Feeling is inappropriate, and how the Admin settled it. */
export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    feelingId: uuid("feeling_id")
      .notNull()
      .references(() => feelings.id, { onDelete: "cascade" }),
    reporterId: uuid("reporter_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    /** Null while open; then "innocent" (cleared) or "removed". */
    outcome: text("outcome").$type<"innocent" | "removed">(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => [index("reports_by_feeling").on(table.feelingId)],
);

/** What was done, by whom and when: Reports and Admin actions. Rows are only ever added. */
export const auditLog = pgTable("audit_log", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  at: timestamp("at", { withTimezone: true }).notNull(),
  /** No reference to users: the record outlives an account. */
  actorId: uuid("actor_id"),
  action: text("action").notNull(),
  feelingId: uuid("feeling_id"),
  detail: text("detail"),
});
