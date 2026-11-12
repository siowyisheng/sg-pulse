import { createHash, randomUUID } from "node:crypto";
import {
  compactDecrypt,
  createRemoteJWKSet,
  decodeProtectedHeader,
  exportJWK,
  generateKeyPair,
  importJWK,
  jwtVerify,
  SignJWT,
  type JWK,
  type JWTVerifyGetKey,
} from "jose";
import type { Singpass, SingpassPerson } from "@/core/ports";

/**
 * Singpass login with Myinfo over its FAPI 2.0 API: a pushed authorisation request with
 * PKCE, DPoP and a `private_key_jwt` client assertion; then the token request, the encrypted and signed
 * ID token, and the encrypted and signed userinfo with the Myinfo data.
 * https://docs.developer.singpass.gov.sg/docs/technical-specifications/integration-guide
 */

export const SINGPASS_ISSUERS = {
  staging: "https://stg-id.singpass.gov.sg/fapi",
  production: "https://id.singpass.gov.sg/fapi",
} as const;

/** The Myinfo items Yah Lah asks for, and nothing more: no email, no mobile number, no NRIC or FIN. */
export const SINGPASS_SCOPES = "openid name dob sex";

export interface SingpassFapiConfig {
  /** Singpass's issuer: discovery is read from `${issuer}/.well-known/openid-configuration`. */
  issuer: string;
  /** The App ID from the Singpass Developer Portal. */
  clientId: string;
  /** Registered with Singpass; Yah Lah's /auth/singpass/callback. */
  redirectUri: string;
  /** Yah Lah's private keys (SINGPASS_PRIVATE_JWKS): an ES256 signing key and an ECDH-ES+A256KW encryption key. */
  privateKeys: JWK[];
  fetch?: typeof fetch;
  /** Singpass's signing keys; read from its jwks_uri unless given (tests). */
  singpassKeys?: JWTVerifyGetKey;
}

interface Discovery {
  issuer: string;
  pushed_authorization_request_endpoint: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  jwks_uri: string;
}

/** Discovery is cached for an hour, as Singpass suggests. */
const DISCOVERY_CACHE_MS = 60 * 60 * 1000;
/** Singpass allows client assertions and DPoP proofs up to 2 minutes; ours last 1. */
const PROOF_LIFETIME_SECONDS = 60;
const CLOCK_TOLERANCE_SECONDS = 30;

const nowSeconds = () => Math.floor(Date.now() / 1000);
const sha256 = (value: string) => createHash("sha256").update(value).digest("base64url");

class SingpassProtocolError extends Error {
  override name = "SingpassProtocolError";
}

/** Checks the configuration once, so a mistake shows when the app starts rather than at someone's login. */
export function assertValidSingpassConfig(config: SingpassFapiConfig) {
  const problems: string[] = [];
  if (!/^https:\/\//.test(config.issuer)) problems.push("the issuer must be an https URL");
  if (!config.clientId) problems.push("the client ID is missing");
  if (!/^https?:\/\//.test(config.redirectUri)) problems.push("the redirect URI must be a URL");
  const sig = config.privateKeys.find((key) => key.use === "sig" && key.alg === "ES256" && key.d);
  const enc = config.privateKeys.find((key) => key.use === "enc" && key.alg === "ECDH-ES+A256KW" && key.d);
  if (!sig) problems.push("there is no private ES256 signing key");
  if (!enc) problems.push("there is no private ECDH-ES+A256KW encryption key");
  if (problems.length > 0) throw new Error(`Singpass is misconfigured: ${problems.join("; ")}.`);
}

export function createSingpassFapi(config: SingpassFapiConfig): Singpass {
  assertValidSingpassConfig(config);
  const http = config.fetch ?? fetch;
  // Signing uses the first signing key, so a rotation keeps using the old one until it is removed.
  const signingJwk = config.privateKeys.find((key) => key.use === "sig" && key.d)!;
  const encryptionJwks = config.privateKeys.filter((key) => key.use === "enc" && key.d);

  let discovery: { value: Discovery; at: number } | undefined;
  let singpassKeys = config.singpassKeys;

  async function discover(): Promise<Discovery> {
    if (discovery && Date.now() - discovery.at < DISCOVERY_CACHE_MS) return discovery.value;
    const response = await http(`${config.issuer}/.well-known/openid-configuration`);
    if (!response.ok) throw new SingpassProtocolError(`Singpass discovery failed with ${response.status}`);
    const value = (await response.json()) as Discovery;
    if (value.issuer !== config.issuer) throw new SingpassProtocolError(`Singpass discovery names issuer ${value.issuer}, not ${config.issuer}`);
    discovery = { value, at: Date.now() };
    singpassKeys ??= createRemoteJWKSet(new URL(value.jwks_uri));
    return value;
  }

  async function clientAssertion(audience: string) {
    const key = await importJWK(signingJwk, "ES256");
    return new SignJWT({ jti: randomUUID() })
      .setProtectedHeader({ alg: "ES256", typ: "JWT", ...(signingJwk.kid ? { kid: signingJwk.kid } : {}) })
      .setIssuer(config.clientId)
      .setSubject(config.clientId)
      .setAudience(audience)
      .setIssuedAt()
      .setExpirationTime(nowSeconds() + PROOF_LIFETIME_SECONDS)
      .sign(key);
  }

  async function dpopProof(dpopJwk: JWK, method: "GET" | "POST", url: string, extra: { ath?: string; nonce?: string } = {}) {
    const { d: _private, ...publicJwk } = dpopJwk;
    const key = await importJWK(dpopJwk, "ES256");
    return new SignJWT({ htm: method, htu: url, jti: randomUUID(), ...extra })
      .setProtectedHeader({ alg: "ES256", typ: "dpop+jwt", jwk: publicJwk })
      .setIssuedAt()
      .setExpirationTime(nowSeconds() + PROOF_LIFETIME_SECONDS)
      .sign(key);
  }

  /**
   * Sends a request with a DPoP proof; if Singpass asks for a DPoP nonce (RFC 9449), sends it once more
   * with the nonce it gave.
   */
  async function withDpop(dpopJwk: JWK, method: "GET" | "POST", url: string, init: { headers?: Record<string, string>; body?: string }, ath?: string) {
    const send = async (nonce?: string) =>
      http(url, {
        method,
        headers: { ...init.headers, DPoP: await dpopProof(dpopJwk, method, url, { ...(ath ? { ath } : {}), ...(nonce ? { nonce } : {}) }) },
        ...(init.body !== undefined ? { body: init.body } : {}),
      });
    const first = await send();
    const nonce = first.headers.get("DPoP-Nonce");
    if (!first.ok && nonce && (await first.clone().text()).includes("use_dpop_nonce")) return send(nonce);
    return first;
  }

  async function failure(step: string, response: Response) {
    let detail = "";
    try {
      const body = (await response.json()) as { error?: string; error_description?: string };
      detail = [body.error, body.error_description].filter(Boolean).join(": ");
    } catch {
      // Not JSON; the status says enough.
    }
    return new SingpassProtocolError(`Singpass ${step} failed with ${response.status}${detail ? ` (${detail})` : ""}`);
  }

  /** Decrypts a JWE with whichever of our encryption keys it names, then checks Singpass's signature. */
  async function openToken(token: string, issuer: string) {
    const { kid } = decodeProtectedHeader(token);
    const candidates = kid ? encryptionJwks.filter((key) => key.kid === kid) : encryptionJwks;
    if (candidates.length === 0) throw new SingpassProtocolError(`Singpass encrypted to a key we don't have (${kid})`);
    let inner: string | undefined;
    for (const jwk of candidates) {
      try {
        const { plaintext } = await compactDecrypt(token, await importJWK(jwk, "ECDH-ES+A256KW"));
        inner = new TextDecoder().decode(plaintext);
        break;
      } catch {
        // Try the next key with that id, if any.
      }
    }
    if (!inner) throw new SingpassProtocolError("Couldn't decrypt Singpass's token");
    const { payload } = await jwtVerify(inner, singpassKeys!, {
      issuer,
      audience: config.clientId,
      algorithms: ["ES256", "ES384", "ES512"],
      clockTolerance: CLOCK_TOLERANCE_SECONDS,
    });
    return payload;
  }

  return {
    async authorize({ state, nonce, codeVerifier }) {
      const meta = await discover();
      // A new proof-of-possession key for each login, kept with the login until the callback.
      const { privateKey } = await generateKeyPair("ES256", { extractable: true });
      const dpopJwk = await exportJWK(privateKey);
      const body = new URLSearchParams({
        response_type: "code",
        scope: SINGPASS_SCOPES,
        state,
        nonce,
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        code_challenge: sha256(codeVerifier),
        code_challenge_method: "S256",
        client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
        client_assertion: await clientAssertion(meta.issuer),
      });
      const response = await withDpop(dpopJwk, "POST", meta.pushed_authorization_request_endpoint, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
      if (!response.ok) throw await failure("pushed authorisation request", response);
      const { request_uri: requestUri } = (await response.json()) as { request_uri?: string };
      if (!requestUri) throw new SingpassProtocolError("Singpass gave no request_uri");
      const url = new URL(meta.authorization_endpoint);
      url.searchParams.set("client_id", config.clientId);
      url.searchParams.set("request_uri", requestUri);
      return { url: url.toString(), adapterState: JSON.stringify(dpopJwk) };
    },

    async exchange({ code, nonce, codeVerifier, adapterState }) {
      if (!adapterState) throw new SingpassProtocolError("The login's proof-of-possession key is missing");
      const meta = await discover();
      const dpopJwk = JSON.parse(adapterState) as JWK;

      const tokenResponse = await withDpop(dpopJwk, "POST", meta.token_endpoint, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: config.redirectUri,
          code_verifier: codeVerifier,
          client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
          client_assertion: await clientAssertion(meta.issuer),
        }).toString(),
      });
      if (!tokenResponse.ok) throw await failure("token request", tokenResponse);
      const tokens = (await tokenResponse.json()) as { id_token?: string; access_token?: string; token_type?: string };
      if (!tokens.id_token || !tokens.access_token) throw new SingpassProtocolError("Singpass gave no ID token or access token");

      const idToken = await openToken(tokens.id_token, meta.issuer);
      if (idToken.nonce !== nonce) throw new SingpassProtocolError("The ID token's nonce doesn't match this login");
      const subject = idToken.sub;
      if (typeof subject !== "string" || subject === "") throw new SingpassProtocolError("The ID token has no subject");

      const userinfoResponse = await withDpop(
        dpopJwk,
        "GET",
        meta.userinfo_endpoint,
        { headers: { Authorization: `DPoP ${tokens.access_token}` } },
        sha256(tokens.access_token),
      );
      if (!userinfoResponse.ok) throw await failure("userinfo request", userinfoResponse);
      const userinfo = await openToken((await userinfoResponse.text()).trim(), meta.issuer);
      if (userinfo.sub !== subject) throw new SingpassProtocolError("The userinfo is for someone other than the ID token");
      return personFrom(subject, userinfo.person_info);
    },
  };
}

type Item = { unavailable?: boolean; value?: unknown; code?: unknown };

/**
 * Reads the Myinfo items Yah Lah asked for. A missing or partial date of birth can't be used, so it
 * fails. A missing name is let through as empty: that person's Byline has no initials.
 */
export function personFrom(subject: string, personInfo: unknown): SingpassPerson {
  const info = (personInfo ?? {}) as Record<string, Item | undefined>;
  const available = (item: Item | undefined) => (item && !item.unavailable ? item : undefined);

  const dob = available(info.dob)?.value;
  if (typeof dob !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
    throw new SingpassProtocolError("Singpass has no full date of birth for this person");
  }
  const name = available(info.name)?.value;
  const sex = available(info.sex)?.code;
  return {
    subject,
    name: typeof name === "string" ? name : "",
    dateOfBirth: dob,
    sex: typeof sex === "string" ? sex : "U",
  };
}
