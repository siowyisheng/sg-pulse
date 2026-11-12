import { describe, expect, it, vi } from "vitest";
import { assertValidSingpassConfig, createSingpassFapi, SINGPASS_SCOPES } from "@/adapters/singpass-fapi";
import { generateSingpassKeys, parseSingpassPrivateJwks, publicJwksOf } from "@/core/jwks";
import { createTestApp } from "@/testing/harness";
import { CLIENT_ID, createFakeSingpassServer, ISSUER, myinfo, REDIRECT_URI, type Tampering } from "./fake-singpass-server";

vi.setConfig({ testTimeout: 30_000 });

const SUBJECT = "d45d8f21-6178-4713-b962-8635ed2a945a";

async function setup(tampering: Tampering = {}) {
  const server = await createFakeSingpassServer(tampering);
  const singpass = createSingpassFapi({
    issuer: ISSUER,
    clientId: CLIENT_ID,
    redirectUri: REDIRECT_URI,
    privateKeys: server.privateKeys,
    fetch: server.fetch,
    singpassKeys: server.singpassKeys,
  });
  /** One login: authorize, consent, exchange. */
  const login = async (personInfo: Record<string, unknown> = myinfo(), nonce = "the-nonce") => {
    const codeVerifier = "v".repeat(43);
    const { url, adapterState } = await singpass.authorize({ state: "the-state", nonce, codeVerifier });
    const { code } = server.consent(url, { subject: SUBJECT, personInfo });
    return singpass.exchange({ code, nonce, codeVerifier, ...(adapterState ? { adapterState } : {}) });
  };
  return { server, singpass, login };
}

describe("what Yah Lah asks Singpass for", () => {
  it("never asks for email, mobile number or NRIC", () => {
    expect(SINGPASS_SCOPES.split(" ").sort()).toEqual(["dob", "name", "openid", "sex"]);
  });

  it("hands on only the Singpass user ID, name, date of birth and sex, whatever else Singpass sends", async () => {
    const { login } = await setup();
    const person = await login(myinfo({ uinfin: { value: "S1234567A" }, email: { value: "mei@example.com" }, mobileno: { nbr: { value: "91234567" } } }));
    expect(person).toEqual({ subject: SUBJECT, name: "TAN MEI LING", dateOfBirth: "1995-04-02", sex: "F" });
  });
});

describe("reading what Singpass gives", () => {
  it("refuses a person without a full date of birth", async () => {
    const { login } = await setup();
    await expect(login(myinfo({ dob: { value: "1995-04" } }))).rejects.toThrow(/date of birth/);
    await expect(login(myinfo({ dob: { unavailable: true } }))).rejects.toThrow(/date of birth/);
  });

  it("takes a sex Singpass doesn't record as unknown", async () => {
    const { login } = await setup();
    expect((await login(myinfo({ sex: { unavailable: true } }))).sex).toBe("U");
  });

  it("lets a person with no name in, with an empty name", async () => {
    const { login } = await setup();
    expect((await login(myinfo({ name: { unavailable: true } }))).name).toBe("");
    expect((await login(myinfo({ name: undefined }))).name).toBe("");
  });
});

describe("checking Singpass's tokens", () => {
  it.each<[string, Tampering]>([
    ["another issuer", { idTokenClaims: { iss: "https://evil.example/fapi" } }],
    ["another audience", { idTokenClaims: { aud: "someone-else" } }],
    ["an expired ID token", { idTokenClaims: { exp: Math.floor(Date.now() / 1000) - 3600 } }],
    ["another login's nonce", { idTokenClaims: { nonce: "not-this-one" } }],
    ["a signature Singpass didn't make", { signWithUnknownKey: true }],
    ["userinfo about someone else", { userinfoClaims: { sub: "11111111-1111-4111-8111-111111111111" } }],
    ["userinfo for another audience", { userinfoClaims: { aud: "someone-else" } }],
  ])("refuses %s", async (_name, tampering) => {
    const { login } = await setup(tampering);
    await expect(login()).rejects.toThrow();
  });

  it("uses a new proof-of-possession key for every login, and fails without it", async () => {
    const { server, singpass, login } = await setup();
    await login();
    await login();
    expect(new Set(server.seen.dpopKeys).size).toBe(2);

    const { url } = await singpass.authorize({ state: "s", nonce: "n", codeVerifier: "v".repeat(43) });
    const { code } = server.consent(url, { subject: SUBJECT, personInfo: myinfo() });
    await expect(singpass.exchange({ code, nonce: "n", codeVerifier: "v".repeat(43) })).rejects.toThrow(/proof-of-possession/);
  });

  it("sends the DPoP nonce Singpass asks for", async () => {
    const { login } = await setup({ requireDpopNonce: true });
    expect((await login()).subject).toBe(SUBJECT);
  });
});

describe("through the app", () => {
  async function appWith(tampering: Tampering = {}) {
    const { server, singpass } = await setup(tampering);
    const world = await createTestApp({ now: "2026-11-12T09:00:00+08:00", singpass });
    const finish = async (personInfo: Record<string, unknown>) => {
      const { url, state } = await world.app.startSingpass();
      return world.app.finishSingpass({ ...server.consent(url, { subject: SUBJECT, personInfo }), browserState: state });
    };
    return { ...world, finish };
  }

  it("turns a refused token into a Singpass failure the person can retry", async () => {
    const { finish } = await appWith({ idTokenClaims: { nonce: "not-this-one" } });
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(finish(myinfo())).rejects.toMatchObject({ code: "SINGPASS_FAILED" });
  });

  it("gives a person with no name a Byline without initials, and keeps no key once the login is finished", async () => {
    const { app, finish, everythingStored } = await appWith();
    const login = await finish(myinfo({ name: { unavailable: true } }));
    if (login.outcome !== "consent-needed") throw new Error("expected consent");
    expect(await app.consentPreview(login.proof)).toEqual({ byline: { initials: null, sex: "F", ageBand: "30s" } });
    // The one-login proof-of-possession key is private; it goes as soon as it has been used.
    expect(await everythingStored()).not.toContain('\\"d\\"');
  });

  it("refuses an under-13 from Myinfo's date of birth", async () => {
    const { finish } = await appWith();
    await expect(finish(myinfo({ dob: { value: "2014-01-01" } }))).rejects.toMatchObject({ code: "TOO_YOUNG" });
  });
});

describe("configuration", () => {
  it("fails at once, saying what is wrong", async () => {
    const { server } = await setup();
    const good = { issuer: ISSUER, clientId: CLIENT_ID, redirectUri: REDIRECT_URI, privateKeys: server.privateKeys };
    expect(() => assertValidSingpassConfig(good)).not.toThrow();
    expect(() => assertValidSingpassConfig({ ...good, privateKeys: server.privateKeys.filter((k) => k.use === "sig") })).toThrow(/encryption key/);
    expect(() => assertValidSingpassConfig({ ...good, privateKeys: server.privateKeys.filter((k) => k.use === "enc") })).toThrow(/signing key/);
    expect(() => assertValidSingpassConfig({ ...good, clientId: "" })).toThrow(/client ID/);
    expect(() => assertValidSingpassConfig({ ...good, issuer: "http://insecure" })).toThrow(/issuer/);
  });

  it("leaves Singpass unconnected without a client ID, and lists what's missing with one", async () => {
    const { getSingpass } = await import("@/composition");
    const { server } = await setup();
    expect(() => getSingpass({}).authorize({ state: "s", nonce: "n", codeVerifier: "v" })).toThrow(/not configured/);
    expect(() => getSingpass({ SINGPASS_CLIENT_ID: CLIENT_ID })).toThrow(/SINGPASS_ENVIRONMENT.*SINGPASS_REDIRECT_URI.*SINGPASS_PRIVATE_JWKS/);
    expect(() => getSingpass({ SINGPASS_CLIENT_ID: CLIENT_ID, SINGPASS_ENVIRONMENT: "live", SINGPASS_REDIRECT_URI: REDIRECT_URI, SINGPASS_PRIVATE_JWKS: "{}" })).toThrow(/SINGPASS_ENVIRONMENT/);
    expect(() =>
      getSingpass({
        SINGPASS_CLIENT_ID: CLIENT_ID,
        SINGPASS_ENVIRONMENT: "staging",
        SINGPASS_REDIRECT_URI: REDIRECT_URI,
        SINGPASS_PRIVATE_JWKS: JSON.stringify({ keys: server.privateKeys }),
      }),
    ).not.toThrow();
  });
});

describe("the keys Yah Lah publishes for Singpass", () => {
  it("are a signing and an encryption key, with the private part left out", () => {
    const { privateJwks, publicJwks } = generateSingpassKeys(new Date("2026-11-13T00:00:00Z"));
    expect(publicJwks.keys.map((key) => [key.use, key.alg, key.crv])).toEqual([
      ["sig", "ES256", "P-256"],
      ["enc", "ECDH-ES+A256KW", "P-256"],
    ]);
    expect(JSON.stringify(publicJwks)).not.toContain('"d"');
    expect(publicJwksOf(parseSingpassPrivateJwks(JSON.stringify(privateJwks)))).toEqual(publicJwks);
    expect(publicJwks.keys[0]?.kid).toMatch(/^sig-2026-11-13T00:00:00Z-[0-9a-f]{6}$/);
  });

  it("are separate for each environment: every run makes new ones", () => {
    const now = new Date("2026-11-13T00:00:00Z");
    expect(generateSingpassKeys(now).publicJwks).not.toEqual(generateSingpassKeys(now).publicJwks);
  });

  it("publish nothing when the setting is missing or unreadable, and leave out a key Singpass wouldn't accept", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(publicJwksOf(parseSingpassPrivateJwks(undefined))).toEqual({ keys: [] });
    expect(publicJwksOf(parseSingpassPrivateJwks("not json"))).toEqual({ keys: [] });
    const { privateJwks } = generateSingpassKeys(new Date());
    const withBadKey = { keys: [{ ...privateJwks.keys[0], alg: "RS256" }, privateJwks.keys[1]] };
    expect(publicJwksOf(withBadKey).keys.map((key) => key.use)).toEqual(["enc"]);
  });
});
