import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { createFakeSingpass } from "@/adapters/fake-singpass";
import { createApp } from "@/core/app";
import type { Singpass } from "@/core/ports";
import { schema } from "@/db";
import { FakeClock, FakeWebPush } from "./fakes";

export interface TestAppOptions {
  /** Start time of the controllable clock. */
  now?: string;
  /** The fake Singpass unless a test brings its own (such as the real adapter against a fake server). */
  singpass?: Singpass;
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

/** Back to freshly migrated: all rows gone, and the counters restarted. */
async function emptyTheDatabase(client: PGlite) {
  await client.exec(`
    DO $$
    DECLARE tables text;
    BEGIN
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
  const app = createApp({ db, clock, webPush, singpass: options.singpass ?? createFakeSingpass() });

  return { app, clock, webPush };
}
