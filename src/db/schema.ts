import { boolean, date, pgEnum, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const polarity = pgEnum("polarity", ["good", "bad"]);

/** A Feeling. A Seed Feeling is written by the team and has no Submitter. */
export const feelings = pgTable("feelings", {
  id: uuid("id").primaryKey().defaultRandom(),
  text: text("text").notNull(),
  polarity: polarity("polarity").notNull(),
  /** Normalised: lowercase, no "#". */
  hashtag: text("hashtag").notNull(),
  seed: boolean("seed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

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
