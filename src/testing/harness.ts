import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { codeFor, createFakeSingpass } from "@/adapters/fake-singpass";
import { createApp } from "@/core/app";
import type { Singpass, SingpassPerson } from "@/core/ports";
import { schema } from "@/db";
import { FakeClock, FakeMailer, FakeRandom, FakeWebPush } from "./fakes";

export interface TestAppOptions {
  /** Start time of the controllable clock. */
  now?: string;
  /** The fake Singpass unless a test brings its own (such as the real adapter against a fake server). */
  singpass?: Singpass;
  /** Where feedback goes. Null switches it off. A test address unless given. */
  feedbackTo?: string | null;
}

/**
 * Building and migrating a Postgres takes seconds, so each test process does it once and every
 * test starts from the same empty, migrated database (see `emptyTheDatabase`). That means one
 * world at a time: a test must not use a world after the next one has been created.
 */
let sharedDatabase: Promise<{ client: PGlite; db: ReturnType<typeof drizzle<typeof schema>> }> | undefined;

function migratedDatabase() {
  sharedDatabase ??= (async () => {
    const client = new PGlite();
    const db = drizzle(client, { schema });
    await migrate(db, { migrationsFolder: "./drizzle" });
    return { client, db };
  })();
  return sharedDatabase;
}

/**
 * Back to freshly migrated: all rows gone, and the counters restarted, plus any triggers or
 * functions a test made to simulate a failure (the migrations create neither).
 */
async function emptyTheDatabase(client: PGlite) {
  await client.exec(`
    DO $$
    DECLARE r record; tables text;
    BEGIN
      FOR r IN SELECT t.tgname, c.relname FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid WHERE NOT t.tgisinternal LOOP
        EXECUTE format('DROP TRIGGER %I ON %I', r.tgname, r.relname);
      END LOOP;
      FOR r IN SELECT p.oid::regprocedure AS signature FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace LOOP
        EXECUTE 'DROP FUNCTION ' || r.signature;
      END LOOP;
      SELECT string_agg(format('%I', tablename), ', ') INTO tables FROM pg_tables WHERE schemaname = 'public';
      EXECUTE 'TRUNCATE ' || tables || ' RESTART IDENTITY CASCADE';
    END $$;
  `);
}

/**
 * Builds the real application against an in-memory Postgres (PGlite) with fakes at the external
 * edges: the clock, Singpass and web push.
 */
export async function createTestApp(options: TestAppOptions = {}) {
  const { client, db } = await migratedDatabase();
  await emptyTheDatabase(client);

  const clock = new FakeClock(options.now ?? "2026-01-01T00:00:00+08:00");
  const webPush = new FakeWebPush();
  const mailer = new FakeMailer();
  const random = new FakeRandom();
  const app = createApp({ db, clock, webPush, mailer, feedbackTo: options.feedbackTo === undefined ? "owner@example.com" : options.feedbackTo, random: random.next, singpass: options.singpass ?? createFakeSingpass() });

  /** A round trip to the fake Singpass as this person, in one browser. */
  async function logIn(person: SingpassPerson) {
    const { state } = await app.startSingpass();
    return app.finishSingpass({ state, code: codeFor(person), browserState: state });
  }

  /** Logs this person in, agreeing on the consent screen if they are new. */
  async function signUp(person: SingpassPerson) {
    const login = await logIn(person);
    const session = login.outcome === "signed-in" ? login.session : await app.confirmConsent(login.proof);
    const me = await app.authenticate(session.token);
    if (!me) throw new Error("The new session did not work");
    return { session, me };
  }

  /** Logs this person in as an Admin. */
  async function signUpAdmin(person: SingpassPerson) {
    const first = await signUp(person);
    await app.operator.makeAdmin(first.me.userId);
    const me = await app.authenticate(first.session.token);
    if (!me) throw new Error("The Admin's session did not work");
    return { session: first.session, me };
  }

  /** Every row of every table, as text: for checking that something was never written down. */
  async function everythingStored(): Promise<string> {
    const tables = await client.query<{ tablename: string }>("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
    const rows = await Promise.all(tables.rows.map(async ({ tablename }) => (await client.query(`SELECT * FROM "${tablename}"`)).rows));
    return JSON.stringify(rows);
  }

  /**
   * How many Upvotes each Feeling has in a Cycle (today's unless given), by its text. Read straight
   * from storage: the application shows counts to nobody until a winner is announced.
   */
  async function tally(cycle = app.currentCycle()): Promise<Record<string, number>> {
    const counted = await client.query<{ text: string; upvotes: number }>(
      `SELECT feelings.text, count(*)::int AS upvotes FROM upvotes JOIN feelings ON feelings.id = upvotes.feeling_id WHERE upvotes.cycle = $1 GROUP BY feelings.text`,
      [cycle],
    );
    return Object.fromEntries(counted.rows.map((row) => [row.text, row.upvotes]));
  }

  /**
   * Makes the storage refuse to write a row to this table, as a failing connection would, so a test
   * can check that an action that writes in several places leaves nothing half done. Returns the
   * function that lets writes through again.
   */
  async function refuseWritesTo(table: "reports" | "audit_log" | "feelings_of_the_day" | "users" | "feelings"): Promise<() => Promise<void>> {
    const name = `refuse_${table}`;
    await client.exec(`
      CREATE FUNCTION ${name}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'storage refused a write to ${table}'; END $$;
      CREATE TRIGGER ${name} BEFORE INSERT OR UPDATE OR DELETE ON "${table}" FOR EACH ROW EXECUTE FUNCTION ${name}();
    `);
    return async () => {
      await client.exec(`DROP TRIGGER ${name} ON "${table}"; DROP FUNCTION ${name}();`);
    };
  }

  return { app, clock, webPush, mailer, random, tally, logIn, signUp, signUpAdmin, everythingStored, refuseWritesTo };
}
