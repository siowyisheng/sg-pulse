import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import type { JWK } from "jose";
import { createSingpassFapi, SINGPASS_ISSUERS } from "@/adapters/singpass-fapi";
import { createApp, type App } from "@/core/app";
import { parseSingpassPrivateJwks } from "@/core/jwks";
import type { Clock, Singpass, WebPush } from "@/core/ports";
import { schema } from "@/db";
import { isDemoMode } from "@/demo-flag";

/** Real adapters are added by later tickets; until then they fail loudly. */
function notConfigured(name: string): never {
  throw new Error(`${name} is not configured.`);
}

const SINGPASS_ENVIRONMENTS = { staging: SINGPASS_ISSUERS.staging, production: SINGPASS_ISSUERS.production } as const;

/**
 * Singpass is connected once SINGPASS_CLIENT_ID is set; until then the site offers no way to log in.
 * Once it is set, everything else it needs must be there and right, or this throws (and the app
 * fails at start-up, see instrumentation.ts) rather than at someone's login.
 */
export function getSingpass(env: Record<string, string | undefined> = process.env): Singpass {
  const clientId = env.SINGPASS_CLIENT_ID;
  if (!clientId) return { authorize: () => notConfigured("Singpass"), exchange: () => notConfigured("Singpass") };
  const environment = env.SINGPASS_ENVIRONMENT as keyof typeof SINGPASS_ENVIRONMENTS | undefined;
  const missing = [
    !environment || !(environment in SINGPASS_ENVIRONMENTS) ? 'SINGPASS_ENVIRONMENT ("staging" or "production")' : undefined,
    env.SINGPASS_REDIRECT_URI ? undefined : "SINGPASS_REDIRECT_URI (this site's /auth/singpass/callback, as registered with Singpass)",
    env.SINGPASS_PRIVATE_JWKS ? undefined : "SINGPASS_PRIVATE_JWKS (from npm run singpass:keys)",
  ].filter(Boolean);
  if (missing.length > 0) throw new Error(`SINGPASS_CLIENT_ID is set, so Singpass also needs ${missing.join(", ")}.`);
  return createSingpassFapi({
    issuer: SINGPASS_ENVIRONMENTS[environment!],
    clientId,
    redirectUri: env.SINGPASS_REDIRECT_URI!,
    privateKeys: parseSingpassPrivateJwks(env.SINGPASS_PRIVATE_JWKS).keys as JWK[],
  });
}

/** Kept between requests, so Singpass's discovery document and keys stay cached. */
let singpass: Singpass | undefined;
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
  return createApp({ db, clock: systemClock, singpass: (singpass ??= getSingpass()), webPush });
}
