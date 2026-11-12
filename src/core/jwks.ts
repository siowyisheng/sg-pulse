import { generateKeyPairSync, randomBytes } from "node:crypto";

/**
 * Yah Lah's keys for Singpass. The signing key signs our client assertions to Singpass;
 * Singpass encrypts the ID tokens it sends us with the encryption key. The private keys are kept in
 * the SINGPASS_PRIVATE_JWKS environment variable; the JWKS endpoint publishes the public halves.
 *
 * Order matters during a rotation: new keys go after the old ones, and whatever signs for us uses the
 * first signing key, so it keeps using the old one until the old keys are removed.
 */

/** What Singpass accepts: EC keys on P-256, with this algorithm for each use. */
const KEY_TYPE = "EC";
const CURVE = "P-256";
const ALG_FOR_USE = { sig: "ES256", enc: "ECDH-ES+A256KW" } as const;
type KeyUse = keyof typeof ALG_FOR_USE;

export interface PublicJwk {
  kty: typeof KEY_TYPE;
  crv: typeof CURVE;
  use: KeyUse;
  alg: (typeof ALG_FOR_USE)[KeyUse];
  kid: string;
  x: string;
  y: string;
}

/** A private key: the public fields plus the private `d`. */
export type PrivateJwk = PublicJwk & { d: string };

export interface Jwks<Key> {
  keys: Key[];
}

/** Makes a new signing and encryption key pair, with key ids that say when they were made. */
export function generateSingpassKeys(now: Date): { privateJwks: Jwks<PrivateJwk>; publicJwks: Jwks<PublicJwk> } {
  const stamp = now.toISOString().replace(/\.\d{3}Z$/, "Z");
  // A short random suffix keeps two runs in the same second from sharing a key id.
  const suffix = randomBytes(3).toString("hex");
  const keyFor = (use: KeyUse): PrivateJwk => {
    const { x, y, d } = generateKeyPairSync("ec", { namedCurve: CURVE }).privateKey.export({ format: "jwk" }) as {
      x: string;
      y: string;
      d: string;
    };
    return { kty: KEY_TYPE, crv: CURVE, use, alg: ALG_FOR_USE[use], kid: `${use}-${stamp}-${suffix}`, x, y, d };
  };
  const privateJwks = { keys: [keyFor("sig"), keyFor("enc")] };
  return { privateJwks, publicJwks: publicJwksOf(privateJwks) };
}

/** Why Singpass wouldn't accept this key, if it wouldn't. */
function problemWith(key: Record<string, unknown>): string | undefined {
  if (key.kty !== KEY_TYPE || key.crv !== CURVE) return `must be an ${KEY_TYPE} key on the ${CURVE} curve`;
  if (key.use !== "sig" && key.use !== "enc") return 'must have a use of "sig" or "enc"';
  if (key.alg !== ALG_FOR_USE[key.use]) return `a ${key.use} key must have alg ${ALG_FOR_USE[key.use]}`;
  if (typeof key.kid !== "string" || key.kid === "") return "must have a kid";
  if (typeof key.x !== "string" || typeof key.y !== "string") return "is missing x or y";
  return undefined;
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

// Each problem is logged once per server start, not on every request.
const reported = new Set<string>();
function reportOnce(message: string) {
  if (reported.has(message)) return;
  reported.add(message);
  console.error(message);
}

/**
 * The public key set to publish: only the public fields of each acceptable key, in the order given
 * (during a rotation, old and new are both there). Unacceptable entries are left out and logged.
 */
export function publicJwksOf(jwks: Jwks<unknown>): Jwks<PublicJwk> {
  const keys: PublicJwk[] = [];
  for (const key of jwks.keys) {
    const problem = isObject(key) ? problemWith(key) : "is not a key";
    if (problem || !isObject(key)) {
      reportOnce(`Leaving Singpass key ${String((isObject(key) && key.kid) || "(no kid)")} out of the JWKS: it ${problem}.`);
      continue;
    }
    const { kty, crv, use, alg, kid, x, y } = key as unknown as PublicJwk;
    keys.push({ kty, crv, use, alg, kid, x, y });
  }
  return { keys };
}

/** Reads the SINGPASS_PRIVATE_JWKS value; an empty set if it is unset or can't be read. */
export function parseSingpassPrivateJwks(raw: string | undefined): Jwks<unknown> {
  if (!raw) return { keys: [] };
  try {
    const parsed: unknown = JSON.parse(raw);
    return isObject(parsed) && Array.isArray(parsed.keys) ? { keys: parsed.keys } : { keys: [] };
  } catch {
    reportOnce("SINGPASS_PRIVATE_JWKS is not valid JSON, so the JWKS is empty.");
    return { keys: [] };
  }
}
