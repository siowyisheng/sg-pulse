import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { createFakeSingpass } from "@/adapters/fake-singpass";
import { createApp, type App } from "@/core/app";
import { cycleOf } from "@/core/cycle";
import { schema } from "@/db";

/** Local demo mode (`npm run demo`): the real application on an in-memory Postgres, with sample Seed Feelings. */

const DAY_MS = 86_400_000;

/** Made-up Seed Feelings, one Good and one Bad per day, repeated over the demo's days. */
const SAMPLES = [
  { good: ["Kopi with the neighbours before work", "kopi"], bad: ["Rained the moment I hung out the laundry", "weather"] },
  { good: ["Found a seat on the train at rush hour", "mrt"], bad: ["Queue for chicken rice went round the block", "lunch"] },
  { good: ["Evening breeze at East Coast Park", "weekend"], bad: ["So humid my glasses fogged up", "weather"] },
] as const;

function assertSafeToDemo() {
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    throw new Error("DEMO_MODE is for local development only; unset it before deploying.");
  }
}

async function build(): Promise<App> {
  assertSafeToDemo();
  const db = drizzle(new PGlite(), { schema });
  await migrate(db, { migrationsFolder: "./drizzle" });
  const clock = { now: () => new Date() };
  const app = createApp({
    db,
    clock,
    singpass: createFakeSingpass(),
    webPush: { send: async (_subscription, payload) => console.log(`[demo] push: ${payload.title}: ${payload.body}`) },
  });
  // Today and the next fortnight, so the demo can be left running past midnight.
  for (let day = 0; day < 14; day++) {
    const cycle = cycleOf(new Date(clock.now().getTime() + day * DAY_MS));
    const sample = SAMPLES[day % SAMPLES.length]!;
    await app.addSeedFeelingOfTheDay({ cycle, polarity: "good", text: sample.good[0], hashtag: sample.good[1] });
    await app.addSeedFeelingOfTheDay({ cycle, polarity: "bad", text: sample.bad[0], hashtag: sample.bad[1] });
  }
  return app;
}

// Kept on globalThis so the dev server's reloads don't start a new, empty demo.
const holder = globalThis as { yahLahDemo?: Promise<App> };

export function getDemoApp(): Promise<App> {
  return (holder.yahLahDemo ??= build());
}
