import { randomBytes } from "node:crypto";
import { and, eq, isNull, lt } from "drizzle-orm";
import type { Db } from "@/db";
import { schema } from "@/db";
import type { PendingPerson } from "@/db/schema";
import { ageInYears, initialsOf, MINIMUM_AGE, sexOf } from "./byline";
import { singpassError } from "./errors";
import type { Clock, Singpass, SingpassPerson } from "./ports";
import { hashToken } from "./sessions";

/** How long someone has to come back from Singpass, and then to agree on the consent screen. */
const LOGIN_LIFETIME_MS = 15 * 60_000;

const expired = () => singpassError("SINGPASS_EXPIRED");
const random = () => randomBytes(32).toString("base64url");

/**
 * Round trips to Singpass. `start` sends the person off; `finish` checks what comes back and says
 * who it was. Someone new is remembered, without their name, behind a one-use proof until they
 * agree to join (`claim`) or the login runs out.
 */
export function createSingpassLogins({ db, clock, singpass }: { db: Db; clock: Clock; singpass: Singpass }) {
  const isFresh = (since: Date) => since.getTime() + LOGIN_LIFETIME_MS > clock.now().getTime();

  /** The finished login a proof belongs to, if the proof is unused and fresh. */
  async function loginForProof(proof: string) {
    const [row] = await db
      .select()
      .from(schema.singpassLogins)
      .where(eq(schema.singpassLogins.proofHash, hashToken(`singpass-proof:${proof}`)));
    if (!row?.finishedAt || !row.person || !isFresh(row.finishedAt)) throw expired();
    return { id: row.id, person: row.person };
  }

  return {
    async start(): Promise<{ url: string; state: string }> {
      const now = clock.now();
      // Logins that can no longer be used go, with anything they hold about a person.
      await db.delete(schema.singpassLogins).where(lt(schema.singpassLogins.createdAt, new Date(now.getTime() - 2 * LOGIN_LIFETIME_MS)));
      const state = random();
      const nonce = random();
      const codeVerifier = random();
      const { url, adapterState } = await singpass.authorize({ state, nonce, codeVerifier });
      await db.insert(schema.singpassLogins).values({
        stateHash: hashToken(`singpass-state:${state}`),
        nonce,
        codeVerifier,
        adapterState: adapterState ?? null,
        createdAt: now,
      });
      return { url, state };
    },

    /**
     * Checks Singpass's answer for a login started here and returns who it vouched for, with the
     * name already reduced to initials. `browserState` is the state the starting browser kept (in a
     * cookie): a login only finishes in the browser that started it, so nobody can sign someone
     * else in by sending them a callback link. Refuses under-13s.
     */
    async finish(input: { state: string; code: string; browserState: string | undefined }): Promise<{ loginId: string; person: PendingPerson }> {
      const now = clock.now();
      if (!input.browserState || input.browserState !== String(input.state)) throw expired();
      const [login] = await db
        .select()
        .from(schema.singpassLogins)
        .where(eq(schema.singpassLogins.stateHash, hashToken(`singpass-state:${String(input.state)}`)));
      if (!login || login.finishedAt || !isFresh(login.createdAt)) throw expired();
      // Claim the login first, so the same answer can't be replayed; what the adapter carried goes with it.
      const claimed = await db
        .update(schema.singpassLogins)
        .set({ finishedAt: now, adapterState: null })
        .where(and(eq(schema.singpassLogins.id, login.id), isNull(schema.singpassLogins.finishedAt)))
        .returning({ id: schema.singpassLogins.id });
      if (claimed.length === 0) throw expired();

      let vouched: SingpassPerson;
      try {
        vouched = await singpass.exchange({
          code: String(input.code),
          nonce: login.nonce,
          codeVerifier: login.codeVerifier,
          ...(login.adapterState ? { adapterState: login.adapterState } : {}),
        });
        if (!/^\d{4}-\d{2}-\d{2}$/.test(vouched.dateOfBirth)) throw new Error("Singpass gave no usable date of birth");
      } catch (error) {
        console.error("Singpass exchange failed", error);
        throw singpassError("SINGPASS_FAILED");
      }
      if (ageInYears(vouched.dateOfBirth, now) < MINIMUM_AGE) throw singpassError("TOO_YOUNG");
      // The name stops here: only its initials go any further.
      const person = { subject: vouched.subject, initials: initialsOf(vouched.name), sex: sexOf(vouched.sex), dateOfBirth: vouched.dateOfBirth };
      return { loginId: login.id, person };
    },

    /** Keeps a new person behind a one-use proof while they read the consent screen. */
    async holdForConsent(loginId: string, person: PendingPerson): Promise<string> {
      const proof = random();
      await db
        .update(schema.singpassLogins)
        .set({ proofHash: hashToken(`singpass-proof:${proof}`), person })
        .where(eq(schema.singpassLogins.id, loginId));
      return proof;
    },

    /** Who a proof is for. The proof stays usable. */
    peek: async (proof: string): Promise<PendingPerson> => (await loginForProof(String(proof))).person,

    /** Uses the proof up; only one caller gets the person. */
    async claim(proof: string): Promise<PendingPerson> {
      const login = await loginForProof(String(proof));
      const used = await db.delete(schema.singpassLogins).where(eq(schema.singpassLogins.id, login.id)).returning({ id: schema.singpassLogins.id });
      if (used.length === 0) throw expired();
      return login.person;
    },
  };
}
