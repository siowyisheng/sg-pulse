import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { codeFor, createFakeSingpass } from "@/adapters/fake-singpass";
import { createApp, type App, type Me } from "@/core/app";
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

/** Made-up Candidates for today, written by made-up people, so there is something to browse. */
const CANDIDATES: [name: string, born: string, sex: string, polarity: "good" | "bad", hashtag: string, text: string][] = [
  ["TAN WEI MING", "1991-04-02", "M", "good", "mrt", "Got a seat on the train at rush hour"],
  ["NUR AISYAH BINTE ABDULLAH", "2004-07-01", "F", "good", "mrt", "Train came the moment I reached the platform"],
  ["RAJ S/O KUMAR", "1978-09-12", "M", "good", "mrt", "Aunty offered me her seat, I said no need lah"],
  ["LEE HUI MIN", "1986-01-23", "F", "good", "kopi", "Kopi uncle remembered my order"],
  ["GOH KAI XIN", "2009-05-05", "F", "good", "kopi", "Milo dinosaur after exams"],
  ["ONG BEE LIAN", "1958-11-30", "F", "good", "weather", "Cool breeze this morning, like aircon"],
  ["CHUA JUN JIE", "1999-06-10", "M", "good", "hawker", "Found a new chicken rice stall, shiok"],
  ["DEEPA RAMESH", "1972-11-09", "F", "good", "hawker", "Prata was crispy today"],
  ["LIM YONG XIANG", "1980-06-10", "M", "bad", "mrt", "Train fault again on the way to work"],
  ["SITI NURHALIZA BINTE OMAR", "1995-03-03", "F", "bad", "mrt", "Squeezed like sardines at Jurong East"],
  ["WONG WAI MUN", "1988-06-10", "U", "bad", "weather", "So humid my glasses fogged up"],
  ["TEO BOON HAO", "1974-03-01", "M", "bad", "weather", "Rained the moment I hung out the laundry"],
  ["FATIMAH BINTE ISMAIL", "1966-02-14", "F", "bad", "prices", "Cai png went up by 50 cents"],
  ["ANG ZHI HAO", "2001-12-05", "M", "bad", "prices", "Kopi now $1.60, wah"],
];

function assertSafeToDemo() {
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    throw new Error("DEMO_MODE is for local development only; unset it before deploying.");
  }
}

async function build(): Promise<App> {
  assertSafeToDemo();
  const db = drizzle(new PGlite(), { schema });
  await migrate(db, { migrationsFolder: "./drizzle" });
  // While the samples go in it is noon, so they are Candidates today even when the demo starts after 21:00.
  let settingUp = true;
  const noon = new Date(`${cycleOf(new Date())}T12:00:00+08:00`);
  const clock = { now: () => (settingUp ? noon : new Date()) };
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
    await app.operator.scheduleSeedFeeling({ cycle, polarity: "good", text: sample.good[0], hashtag: sample.good[1] });
    await app.operator.scheduleSeedFeeling({ cycle, polarity: "bad", text: sample.bad[0], hashtag: sample.bad[1] });
  }
  const writers: Me[] = [];
  for (const [index, [name, dateOfBirth, sex, polarity, hashtag, text]] of CANDIDATES.entries()) {
    const { state } = await app.startSingpass();
    const login = await app.finishSingpass({ state, browserState: state, code: codeFor({ subject: `demo-sample-${index}`, name, dateOfBirth, sex }) });
    if (login.outcome !== "consent-needed") continue;
    const me = await app.authenticate((await app.confirmConsent(login.proof)).token);
    await me?.submitFeeling({ text, polarity, hashtag });
    if (me) writers.push(me);
  }
  // Some Upvotes, unevenly spread, so the Admin's top three and the mix have something to rank.
  for (const [index, voter] of writers.entries()) {
    const liked = await app.candidates({ polarity: index % 3 === 0 ? "bad" : "good", hashtag: index % 2 === 0 ? "mrt" : "weather" });
    const choice = liked.find((candidate) => candidate.text !== CANDIDATES[index]![5]);
    if (choice) await voter.upvote(choice.id).catch(() => undefined);
  }
  settingUp = false;
  return app;
}

// Kept on globalThis so the dev server's reloads don't start a new, empty demo.
const holder = globalThis as { yahLahDemo?: Promise<App> };

export function getDemoApp(): Promise<App> {
  return (holder.yahLahDemo ??= build());
}
