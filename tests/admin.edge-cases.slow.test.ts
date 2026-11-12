import { describe, expect, it } from "vitest";
import { createTestApp } from "@/testing/harness";

const ADMIN = { subject: "s-admin", name: "SIOW YI SHENG", dateOfBirth: "1988-02-03", sex: "M" };
const TAN = { subject: "s-tan", name: "TAN AH KOW", dateOfBirth: "1990-05-01", sex: "M" };
const NOW = "2026-11-12T09:00:00+08:00";
const seed = (cycle: string, polarity: "good" | "bad", text: string, hashtag = "weather") => ({ cycle, polarity, text, hashtag });

describe("who can reach the Admin area", () => {
  it("refuses a User who is not an Admin", async () => {
    const { signUp } = await createTestApp({ now: NOW });
    const { me } = await signUp(TAN);
    expect(me.isAdmin).toBe(false);
    expect(() => me.asAdmin()).toThrow(expect.objectContaining({ code: "NOT_ADMIN" }));
  });

  it("lets a User in once the operator marks them as an Admin, and not before", async () => {
    const { app, signUp } = await createTestApp({ now: NOW });
    const { session, me } = await signUp(TAN);
    await app.operator.makeAdmin(me.userId);
    expect(() => me.asAdmin()).toThrow(expect.objectContaining({ code: "NOT_ADMIN" }));
    const now = await app.authenticate(session.token);
    expect(now?.isAdmin).toBe(true);
    await now!.asAdmin().scheduleSeedFeeling(seed("2026-11-13", "good", "Hello"));
  });

  it("lists Users for the operator without anything that names them", async () => {
    const { app, signUp } = await createTestApp({ now: NOW });
    const { me } = await signUp(TAN);
    expect(await app.operator.listUsers()).toEqual([{ userId: me.userId, byline: "TA · M · 30s", isAdmin: false, joinedAt: new Date(NOW) }]);
  });
});

describe("scheduling Seed Feelings", () => {
  it("shows what is scheduled from today on, in order, with nothing from the past", async () => {
    const { signUpAdmin, clock } = await createTestApp({ now: NOW });
    const admin = (await signUpAdmin(ADMIN)).me.asAdmin();
    await admin.scheduleSeedFeeling(seed("2026-11-14", "bad", "Saturday bad"));
    await admin.scheduleSeedFeeling(seed("2026-11-12", "good", "Today good"));
    await admin.scheduleSeedFeeling(seed("2026-11-13", "good", "Friday good"));
    expect((await admin.scheduledSeedFeelings()).map((s) => `${s.cycle} ${s.polarity} ${s.text}`)).toEqual([
      "2026-11-12 good Today good",
      "2026-11-13 good Friday good",
      "2026-11-14 bad Saturday bad",
    ]);
    clock.set("2026-11-13T00:00:00+08:00");
    expect((await admin.scheduledSeedFeelings()).map((s) => s.text)).toEqual(["Friday good", "Saturday bad"]);
  });

  it("goes live at once when scheduled for today", async () => {
    const { app, signUpAdmin } = await createTestApp({ now: NOW });
    await (await signUpAdmin(ADMIN)).me.asAdmin().scheduleSeedFeeling(seed("2026-11-12", "bad", "Today bad"));
    expect((await app.feelingsOfTheDay()).bad?.text).toBe("Today bad");
  });

  it("refuses a Cycle in the past, a second Feeling for the same Cycle and Polarity, and text that breaks the rules of a Feeling", async () => {
    const { signUpAdmin } = await createTestApp({ now: NOW });
    const admin = (await signUpAdmin(ADMIN)).me.asAdmin();
    await expect(admin.scheduleSeedFeeling(seed("2026-11-11", "good", "Yesterday"))).rejects.toMatchObject({ code: "CYCLE_PAST" });
    await admin.scheduleSeedFeeling(seed("2026-11-13", "good", "First"));
    await expect(admin.scheduleSeedFeeling(seed("2026-11-13", "good", "Second"))).rejects.toMatchObject({ code: "ALREADY_CHOSEN" });
    await expect(admin.scheduleSeedFeeling(seed("2026-11-13", "bad", "a".repeat(101)))).rejects.toMatchObject({ code: "TEXT_TOO_LONG" });
    await expect(admin.scheduleSeedFeeling(seed("2026-11-13", "bad", "Hello", "two words"))).rejects.toMatchObject({ code: "INVALID_HASHTAG" });
  });

  it("can take back a Seed Feeling that has not gone live, to fix a mistake, but not one that has", async () => {
    const { app, signUpAdmin, clock } = await createTestApp({ now: NOW });
    const admin = (await signUpAdmin(ADMIN)).me.asAdmin();
    await admin.scheduleSeedFeeling(seed("2026-11-13", "good", "Typo"));
    await admin.unscheduleSeedFeeling({ cycle: "2026-11-13", polarity: "good" });
    expect(await admin.scheduledSeedFeelings()).toEqual([]);
    await admin.scheduleSeedFeeling(seed("2026-11-13", "good", "Fixed"));

    clock.set("2026-11-13T00:00:00+08:00");
    await expect(admin.unscheduleSeedFeeling({ cycle: "2026-11-13", polarity: "good" })).rejects.toMatchObject({ code: "ALREADY_LIVE" });
    expect((await app.feelingsOfTheDay()).good?.text).toBe("Fixed");
  });
});
