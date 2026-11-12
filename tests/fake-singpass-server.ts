import { createHash, randomUUID } from "node:crypto";
import {
  calculateJwkThumbprint,
  CompactEncrypt,
  createLocalJWKSet,
  decodeProtectedHeader,
  exportJWK,
  generateKeyPair,
  importJWK,
  jwtVerify,
  SignJWT,
  type JWK,
} from "jose";
import { generateSingpassKeys, publicJwksOf } from "@/core/jwks";

export const ISSUER = "https://stg-id.singpass.gov.sg/fapi";
export const CLIENT_ID = "aBcD1234eFgH5678iJkL9012mNoP3456";
export const REDIRECT_URI = "https://sg-pulse.vercel.app/auth/singpass/callback";

const sha256 = (value: string) => createHash("sha256").update(value).digest("base64url");

/** What a test can change about Singpass's answers, to check the adapter refuses them. */
export interface Tampering {
  idTokenClaims?: Record<string, unknown>;
  userinfoClaims?: Record<string, unknown>;
  personInfo?: Record<string, unknown>;
  /** Ask for a DPoP nonce first, as RFC 9449 allows. */
  requireDpopNonce?: boolean;
  /** Sign with a key Singpass doesn't publish. */
  signWithUnknownKey?: boolean;
}

/**
 * A stand-in for Singpass's FAPI 2.0 server, reached through `fetch`. It checks what the real one
 * checks (client assertions against Yah Lah's public keys, DPoP proofs and their key binding, PKCE, the
 * redirect URI), and answers with an ID token and userinfo signed by it and encrypted to Yah Lah.
 */
export async function createFakeSingpassServer(tampering: Tampering = {}) {
  const { privateJwks } = generateSingpassKeys(new Date());
  const ourPublicKeys = createLocalJWKSet(publicJwksOf(privateJwks) as never);
  const ourEncryptionKey = privateJwks.keys.find((key) => key.use === "enc")!;
  const signing = await generateKeyPair("ES256", { extractable: true });
  const signingPublic = { ...(await exportJWK(signing.publicKey)), kid: "singpass-sig", alg: "ES256", use: "sig" };
  const stranger = await generateKeyPair("ES256");
  const endpoints = {
    issuer: ISSUER,
    pushed_authorization_request_endpoint: `${ISSUER}/par`,
    authorization_endpoint: `${ISSUER}/auth`,
    token_endpoint: `${ISSUER}/token`,
    userinfo_endpoint: `${ISSUER}/userinfo`,
    jwks_uri: `${ISSUER}/.well-known/keys`,
  };

  const pushed = new Map<string, { jkt: string; challenge: string; nonce: string; redirectUri: string; scope: string; state: string }>();
  const codes = new Map<string, { jkt: string; challenge: string; nonce: string; redirectUri: string; person: Person }>();
  const tokens = new Map<string, { jkt: string; person: Person }>();
  const usedJtis = new Set<string>();
  const seen: { scopes: string[]; dpopKeys: string[] } = { scopes: [], dpopKeys: [] };
  let dpopNonce: string | undefined = tampering.requireDpopNonce ? "server-nonce-1" : undefined;

  type Person = { subject: string; personInfo: Record<string, unknown> };

  const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
  const error = (status: number, code: string) => json(status, { error: code });

  async function checkClientAssertion(assertion: string | null) {
    if (!assertion) return false;
    try {
      const { payload } = await jwtVerify(assertion, ourPublicKeys, { issuer: CLIENT_ID, subject: CLIENT_ID, audience: ISSUER });
      return payload.exp! - payload.iat! <= 120 && typeof payload.jti === "string";
    } catch {
      return false;
    }
  }

  async function checkDpop(proof: string | null, method: string, url: string, accessToken?: string): Promise<string | "nonce" | undefined> {
    if (!proof) return undefined;
    const header = decodeProtectedHeader(proof);
    if (header.typ !== "dpop+jwt" || !header.jwk || "d" in header.jwk) return undefined;
    const { payload } = await jwtVerify(proof, await importJWK(header.jwk as JWK, header.alg));
    if (payload.htm !== method || payload.htu !== url || typeof payload.jti !== "string" || usedJtis.has(payload.jti)) return undefined;
    if (payload.exp !== undefined && payload.exp - payload.iat! > 120) return undefined;
    if (accessToken !== undefined && payload.ath !== sha256(accessToken)) return undefined;
    if (dpopNonce && payload.nonce !== dpopNonce) return "nonce";
    usedJtis.add(payload.jti);
    return calculateJwkThumbprint(header.jwk as JWK);
  }

  const nonceNeeded = () => json(400, { error: "use_dpop_nonce" }, { "DPoP-Nonce": dpopNonce! });

  async function sealed(claims: Record<string, unknown>) {
    const key = tampering.signWithUnknownKey ? stranger.privateKey : signing.privateKey;
    const signed = await new SignJWT(claims).setProtectedHeader({ alg: "ES256", typ: "JWT", kid: "singpass-sig" }).sign(key);
    const { d: _private, ...encryptTo } = ourEncryptionKey;
    return new CompactEncrypt(new TextEncoder().encode(signed))
      .setProtectedHeader({ alg: "ECDH-ES+A256KW", enc: "A256CBC-HS512", kid: ourEncryptionKey.kid })
      .encrypt(await importJWK(encryptTo, "ECDH-ES+A256KW"));
  }

  const fetch = async (input: string | URL | Request, init: RequestInit = {}): Promise<Response> => {
    const url = String(input);
    const method = init.method ?? "GET";
    const headers = new Headers(init.headers);
    const form = new URLSearchParams(typeof init.body === "string" ? init.body : "");

    if (url === `${ISSUER}/.well-known/openid-configuration`) return json(200, endpoints);

    if (url === endpoints.pushed_authorization_request_endpoint && method === "POST") {
      if (!(await checkClientAssertion(form.get("client_assertion"))) || form.get("client_id") !== CLIENT_ID) return error(401, "invalid_client");
      const jkt = await checkDpop(headers.get("DPoP"), "POST", url);
      if (jkt === "nonce") return nonceNeeded();
      if (!jkt) return error(400, "invalid_dpop_proof");
      if (form.get("response_type") !== "code" || form.get("code_challenge_method") !== "S256" || form.get("redirect_uri") !== REDIRECT_URI) {
        return error(400, "invalid_request");
      }
      const requestUri = `urn:ietf:params:oauth:request_uri:${randomUUID()}`;
      pushed.set(requestUri, {
        jkt,
        challenge: form.get("code_challenge")!,
        nonce: form.get("nonce")!,
        redirectUri: form.get("redirect_uri")!,
        scope: form.get("scope")!,
        state: form.get("state")!,
      });
      seen.scopes.push(form.get("scope")!);
      seen.dpopKeys.push(jkt);
      return json(201, { request_uri: requestUri, expires_in: 60 });
    }

    if (url === endpoints.token_endpoint && method === "POST") {
      if (!(await checkClientAssertion(form.get("client_assertion")))) return error(401, "invalid_client");
      const jkt = await checkDpop(headers.get("DPoP"), "POST", url);
      if (jkt === "nonce") return nonceNeeded();
      const grant = codes.get(form.get("code") ?? "");
      if (!jkt || !grant || grant.jkt !== jkt) return error(400, "invalid_dpop_proof");
      if (sha256(form.get("code_verifier") ?? "") !== grant.challenge || form.get("redirect_uri") !== grant.redirectUri) return error(400, "invalid_grant");
      codes.delete(form.get("code")!);
      const accessToken = randomUUID();
      tokens.set(accessToken, { jkt, person: grant.person });
      const now = Math.floor(Date.now() / 1000);
      const idToken = await sealed({
        iss: ISSUER,
        aud: CLIENT_ID,
        sub: grant.person.subject,
        sub_type: "user",
        nonce: grant.nonce,
        acr: "urn:singpass:authentication:loa:2",
        amr: ["pwd", "otp-sms"],
        iat: now,
        exp: now + 600,
        ...tampering.idTokenClaims,
      });
      return json(200, { id_token: idToken, access_token: accessToken, token_type: "DPoP" });
    }

    if (url === endpoints.userinfo_endpoint && method === "GET") {
      const accessToken = (headers.get("Authorization") ?? "").replace(/^DPoP /, "");
      const grant = tokens.get(accessToken);
      const jkt = await checkDpop(headers.get("DPoP"), "GET", url, accessToken);
      if (jkt === "nonce") return nonceNeeded();
      if (!grant || !jkt || grant.jkt !== jkt) return error(401, "invalid_token");
      const body = await sealed({
        iss: ISSUER,
        aud: CLIENT_ID,
        sub: grant.person.subject,
        iat: Math.floor(Date.now() / 1000),
        person_info: { ...grant.person.personInfo, ...tampering.personInfo },
        ...tampering.userinfoClaims,
      });
      return new Response(body, { status: 200, headers: { "content-type": "application/jwt" } });
    }

    return error(404, "not_found");
  };

  return {
    fetch: fetch as typeof globalThis.fetch,
    privateKeys: privateJwks.keys as JWK[],
    singpassKeys: createLocalJWKSet({ keys: [signingPublic] }),
    seen,
    /** The person logs in at the authorisation URL and consents; returns what the callback gets. */
    consent(authorizeUrl: string, person: Person) {
      const parsed = new URL(authorizeUrl);
      const request = pushed.get(parsed.searchParams.get("request_uri") ?? "");
      if (!request || parsed.searchParams.get("client_id") !== CLIENT_ID || [...parsed.searchParams.keys()].length !== 2) {
        throw new Error("bad authorisation URL");
      }
      pushed.delete(parsed.searchParams.get("request_uri")!);
      const code = randomUUID();
      const { state, scope: _scope, ...binding } = request;
      codes.set(code, { ...binding, person });
      return { code, state };
    },
    /** Lets the next requests through after a nonce was required once. */
    rotateNonce(next: string) {
      dpopNonce = next;
    },
  };
}

/** Myinfo person data in its v5 shape. */
export const myinfo = (overrides: Record<string, unknown> = {}) => ({
  name: { lastupdated: "2024-09-26", source: "1", classification: "C", value: "TAN MEI LING" },
  dob: { lastupdated: "2024-09-26", source: "1", classification: "C", value: "1995-04-02" },
  sex: { lastupdated: "2024-09-26", source: "1", classification: "C", code: "F", desc: "FEMALE" },
  ...overrides,
});
