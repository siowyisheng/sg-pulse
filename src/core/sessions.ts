import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, lte } from "drizzle-orm";
import type { Db } from "@/db";
import { schema } from "@/db";
import type { Clock } from "./ports";

export const SESSION_LIFETIME_DAYS = 90;
const DAY_MS = 86_400_000;
/** A visit renews the session, but it is only written down once this much of it has been used. */
const RENEW_AFTER_MS = DAY_MS;

/** What the browser keeps (in a cookie) to stay signed in. */
export interface Session {
  token: string;
  expiresAt: Date;
}

const TOKEN_PATTERN = /^[0-9a-f]{64}$/;

// The token is 256 random bits, so a plain hash is enough: there is nothing to guess or crack.
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export function createSessions({ db, clock }: { db: Db; clock: Clock }) {
  const fullLifetimeFrom = (now: Date) => new Date(now.getTime() + SESSION_LIFETIME_DAYS * DAY_MS);

  return {
    async start(userId: string): Promise<Session> {
      const now = clock.now();
      // Sessions that have run out are no use to anyone, so clear them out as new ones start.
      await db.delete(schema.sessions).where(lte(schema.sessions.expiresAt, now));
      const token = randomBytes(32).toString("hex");
      const expiresAt = fullLifetimeFrom(now);
      await db.insert(schema.sessions).values({ tokenHash: hashToken(token), userId, createdAt: now, expiresAt });
      return { token, expiresAt };
    },

    /** The User a token belongs to, if the session is still running. Counts as a visit: the session runs 90 days from now. */
    async visit(token: string) {
      if (!TOKEN_PATTERN.test(token)) return undefined;
      const now = clock.now();
      const tokenHash = hashToken(token);
      const [found] = await db
        .select({ user: schema.users, expiresAt: schema.sessions.expiresAt })
        .from(schema.sessions)
        .innerJoin(schema.users, eq(schema.sessions.userId, schema.users.id))
        .where(and(eq(schema.sessions.tokenHash, tokenHash), gt(schema.sessions.expiresAt, now)));
      if (!found) return undefined;
      const renewed = fullLifetimeFrom(now);
      if (renewed.getTime() - found.expiresAt.getTime() < RENEW_AFTER_MS) return found;
      await db.update(schema.sessions).set({ expiresAt: renewed }).where(eq(schema.sessions.tokenHash, tokenHash));
      return { user: found.user, expiresAt: renewed };
    },

    async end(token: string): Promise<void> {
      if (!TOKEN_PATTERN.test(token)) return;
      await db.delete(schema.sessions).where(eq(schema.sessions.tokenHash, hashToken(token)));
    },
  };
}
