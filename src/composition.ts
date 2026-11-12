import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { createApp, type App } from "@/core/app";
import type { Clock, Singpass, WebPush } from "@/core/ports";
import { schema } from "@/db";
import { isDemoMode } from "@/demo-flag";

/** Real adapters are added by later tickets; until then they fail loudly. */
function notConfigured(name: string): never {
  throw new Error(`${name} isn't connected yet.`);
}

const singpass: Singpass = { authorize: () => notConfigured("Singpass"), exchange: () => notConfigured("Singpass") };
const webPush: WebPush = { send: () => notConfigured("Web push") };
const systemClock: Clock = { now: () => new Date() };

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

/**
 * The application. Normally the production one, wired to Neon Postgres and the real clock;
 * with DEMO_MODE=1 (local only) it runs on in-memory Postgres with sample Feelings.
 */
export async function getApp(): Promise<App> {
  if (isDemoMode()) return (await import("@/demo")).getDemoApp();
  const db = drizzle(neon(requireEnv("DATABASE_URL")), { schema });
  return createApp({ db, clock: systemClock, singpass, webPush });
}
