import { describe, expect, it } from "vitest";
import { codeFor } from "@/adapters/fake-singpass";
import { createTestApp } from "@/testing/harness";

const TAN = { subject: "s-tan", name: "TAN AH KOW", dateOfBirth: "1990-05-01", sex: "M" };
const NOW = "2026-11-12T09:00:00+08:00";

describe("the age gate", () => {
  it("refuses someone under 13 with a clear message, and keeps nothing about them", async () => {
    const { logIn, everythingStored } = await createTestApp({ now: NOW });
    await expect(logIn({ ...TAN, dateOfBirth: "2013-11-13" })).rejects.toMatchObject({
      code: "TOO_YOUNG",
      message: "You need to be 13 or older to take part in Yah Lah.",
    });
    expect(await everythingStored()).not.toContain("s-tan");
  });

  it("lets someone in on their 13th birthday", async () => {
    const { signUp } = await createTestApp({ now: NOW });
    const { me } = await signUp({ ...TAN, dateOfBirth: "2013-11-12" });
    expect(me.byline).toEqual({ initials: null, sex: "M", ageBand: "<18" });
  });
});

describe("what is kept about a User", () => {
  it("never stores the full name, at any step", async () => {
    const { app, logIn, everythingStored } = await createTestApp({ now: NOW });
    const login = await logIn({ ...TAN, name: "TAN AH KOW BARTHOLOMEW" });
    expect(await everythingStored()).not.toMatch(/BARTHOLOMEW|KOW/);
    if (login.outcome !== "consent-needed") throw new Error("expected consent");
    await app.confirmConsent(login.proof);
    const stored = await everythingStored();
    expect(stored).not.toMatch(/BARTHOLOMEW|KOW/);
    expect(stored).toContain("s-tan");
    expect(stored).toContain("1990-05-01");
  });

  it("is one User per Singpass user ID, kept up to date with Myinfo at each login", async () => {
    const { app, signUp, logIn } = await createTestApp({ now: NOW });
    await signUp(TAN);
    const again = await logIn({ ...TAN, name: "LEE AH KOW", sex: "F" });
    if (again.outcome !== "signed-in") throw new Error("expected to be signed in");
    expect((await app.authenticate(again.session.token))?.byline).toEqual({ initials: "LA", sex: "F", ageBand: "30s" });
  });
});

describe("consent", () => {
  it("makes no User until the Visitor agrees", async () => {
    const { logIn } = await createTestApp({ now: NOW });
    const first = await logIn(TAN);
    expect(first.outcome).toBe("consent-needed");
    // Walking away and coming back asks again.
    expect((await logIn(TAN)).outcome).toBe("consent-needed");
  });

  it("can be given once per login, within 15 minutes", async () => {
    const { app, logIn, clock } = await createTestApp({ now: NOW });
    const first = await logIn(TAN);
    if (first.outcome !== "consent-needed") throw new Error("expected consent");
    await app.confirmConsent(first.proof);
    await expect(app.confirmConsent(first.proof)).rejects.toMatchObject({ code: "SINGPASS_EXPIRED" });
    await expect(app.consentPreview(first.proof)).rejects.toMatchObject({ code: "SINGPASS_EXPIRED" });

    const late = await logIn({ ...TAN, subject: "s-late" });
    if (late.outcome !== "consent-needed") throw new Error("expected consent");
    clock.advance({ minutes: 15 });
    await expect(app.confirmConsent(late.proof)).rejects.toMatchObject({ code: "SINGPASS_EXPIRED" });
  });

  it("signs in rather than failing when two tabs agree for the same person", async () => {
    const { app, logIn } = await createTestApp({ now: NOW });
    const one = await logIn(TAN);
    const two = await logIn(TAN);
    if (one.outcome !== "consent-needed" || two.outcome !== "consent-needed") throw new Error("expected consent");
    await app.confirmConsent(one.proof);
    const session = await app.confirmConsent(two.proof);
    expect((await app.authenticate(session.token))?.byline.initials).toBe("TA");
  });
});

describe("the trip to Singpass", () => {
  it("only finishes in the browser that started it, once, within 15 minutes", async () => {
    const { app, clock } = await createTestApp({ now: NOW });
    const code = codeFor(TAN);

    const other = await app.startSingpass();
    await expect(app.finishSingpass({ state: other.state, code, browserState: undefined })).rejects.toMatchObject({ code: "SINGPASS_EXPIRED" });
    await expect(app.finishSingpass({ state: other.state, code, browserState: "someone-else" })).rejects.toMatchObject({ code: "SINGPASS_EXPIRED" });
    await expect(app.finishSingpass({ state: "made-up", code, browserState: "made-up" })).rejects.toMatchObject({ code: "SINGPASS_EXPIRED" });

    const once = await app.startSingpass();
    await app.finishSingpass({ state: once.state, code, browserState: once.state });
    await expect(app.finishSingpass({ state: once.state, code, browserState: once.state })).rejects.toMatchObject({ code: "SINGPASS_EXPIRED" });

    const slow = await app.startSingpass();
    clock.advance({ minutes: 15 });
    await expect(app.finishSingpass({ state: slow.state, code, browserState: slow.state })).rejects.toMatchObject({ code: "SINGPASS_EXPIRED" });
  });

  it("says so when Singpass does not vouch for anyone", async () => {
    const { app } = await createTestApp({ now: NOW });
    const { state } = await app.startSingpass();
    await expect(app.finishSingpass({ state, code: "nonsense", browserState: state })).rejects.toMatchObject({ code: "SINGPASS_FAILED" });
  });
});

describe("a session", () => {
  it("lasts 90 days from the last visit", async () => {
    const { app, signUp, clock } = await createTestApp({ now: NOW });
    const { session } = await signUp(TAN);
    expect(session.expiresAt.toISOString()).toBe("2027-02-10T01:00:00.000Z");

    clock.advance({ hours: 89 * 24 });
    const visit = await app.authenticate(session.token);
    expect(visit?.sessionExpiresAt.toISOString()).toBe("2027-05-10T01:00:00.000Z");

    // 170 days after logging in, but only 81 after the last visit.
    clock.advance({ hours: 81 * 24 });
    expect(await app.authenticate(session.token)).toBeDefined();

    clock.advance({ hours: 90 * 24 });
    expect(await app.authenticate(session.token)).toBeUndefined();
  });

  it("ends 90 days after a visit that never came", async () => {
    const { app, signUp, clock } = await createTestApp({ now: NOW });
    const { session } = await signUp(TAN);
    clock.advance({ hours: 90 * 24 - 1 });
    // Looking without visiting: a fresh world would renew, so step past the end in one go.
    clock.advance({ hours: 1 });
    expect(await app.authenticate(session.token)).toBeUndefined();
  });

  it("ends when the User logs out, and is nobody's for a made-up token", async () => {
    const { app, signUp } = await createTestApp({ now: NOW });
    const { session } = await signUp(TAN);
    await app.signOut(session.token);
    expect(await app.authenticate(session.token)).toBeUndefined();
    expect(await app.authenticate("made-up")).toBeUndefined();
    expect(await app.authenticate("a".repeat(64))).toBeUndefined();
  });
});
