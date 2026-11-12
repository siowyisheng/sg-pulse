import { describe, expect, it } from "vitest";
import { createTestApp } from "@/testing/harness";

const seed = (cycle: string, polarity: "good" | "bad", text: string, hashtag = "weather") => ({ cycle, polarity, text, hashtag });

describe("the Cycle is the Singapore calendar day, worked out on every read", () => {
  it("shows the previous day's Feelings one minute before 00:00 SGT, and the new day's at 00:00", async () => {
    const { app, clock } = await createTestApp({ now: "2026-11-12T23:59:00+08:00" });
    await app.operator.scheduleSeedFeeling(seed("2026-11-12", "good", "Thursday good"));
    await app.operator.scheduleSeedFeeling(seed("2026-11-12", "bad", "Thursday bad"));
    await app.operator.scheduleSeedFeeling(seed("2026-11-13", "good", "Friday good"));
    await app.operator.scheduleSeedFeeling(seed("2026-11-13", "bad", "Friday bad"));

    const before = await app.feelingsOfTheDay();
    expect(before.cycle).toBe("2026-11-12");
    expect([before.good?.text, before.bad?.text]).toEqual(["Thursday good", "Thursday bad"]);

    // Nothing runs at midnight: only the clock moves.
    clock.advance({ minutes: 1 });
    const after = await app.feelingsOfTheDay();
    expect(after.cycle).toBe("2026-11-13");
    expect([after.good?.text, after.bad?.text]).toEqual(["Friday good", "Friday bad"]);
  });

  it("goes by Singapore's date, not UTC's", async () => {
    // 07:59 SGT on the 13th is still the 12th in UTC.
    const { app } = await createTestApp({ now: "2026-11-12T23:59:00Z" });
    await app.operator.scheduleSeedFeeling(seed("2026-11-13", "good", "Friday good"));
    expect((await app.feelingsOfTheDay()).good?.text).toBe("Friday good");
  });

  it("has nothing for a Polarity with no Feeling of the Day", async () => {
    const { app } = await createTestApp({ now: "2026-11-12T09:00:00+08:00" });
    await app.operator.scheduleSeedFeeling(seed("2026-11-12", "good", "Only good today"));
    const today = await app.feelingsOfTheDay();
    expect(today.good?.text).toBe("Only good today");
    expect(today.bad).toBeNull();
  });
});

describe("Seed Feelings follow the rules of a Feeling", () => {
  it("normalises the Hashtag: lowercased, trimmed, no #", async () => {
    const { app } = await createTestApp({ now: "2026-11-12T09:00:00+08:00" });
    await app.operator.scheduleSeedFeeling(seed("2026-11-12", "good", "Remembering", "  #LKY "));
    expect((await app.feelingsOfTheDay()).good?.hashtag).toBe("lky");
  });

  it("refuses text over 100 characters, counting an emoji as one", async () => {
    const { app } = await createTestApp({ now: "2026-11-12T09:00:00+08:00" });
    await expect(app.operator.scheduleSeedFeeling(seed("2026-11-12", "good", "a".repeat(101)))).rejects.toMatchObject({ code: "TEXT_TOO_LONG" });
    await expect(app.operator.scheduleSeedFeeling(seed("2026-11-12", "good", "  "))).rejects.toMatchObject({ code: "TEXT_EMPTY" });
    await app.operator.scheduleSeedFeeling(seed("2026-11-12", "good", "😀".repeat(100)));
  });

  it("refuses a Hashtag that is empty, over 12 characters or more than one word", async () => {
    const { app } = await createTestApp({ now: "2026-11-12T09:00:00+08:00" });
    for (const hashtag of ["#", "thirteenchars", "two words"]) {
      await expect(app.operator.scheduleSeedFeeling(seed("2026-11-12", "good", "Hello", hashtag))).rejects.toMatchObject({ code: "INVALID_HASHTAG" });
    }
  });

  it("refuses a second Feeling of the Day for the same Cycle and Polarity, and a Cycle that is not a date", async () => {
    const { app } = await createTestApp({ now: "2026-11-12T09:00:00+08:00" });
    await app.operator.scheduleSeedFeeling(seed("2026-11-12", "good", "First"));
    await expect(app.operator.scheduleSeedFeeling(seed("2026-11-12", "good", "Second"))).rejects.toMatchObject({ code: "ALREADY_CHOSEN" });
    await expect(app.operator.scheduleSeedFeeling(seed("2026-02-30", "bad", "Never"))).rejects.toMatchObject({ code: "INVALID_CYCLE" });
    expect((await app.feelingsOfTheDay()).good?.text).toBe("First");
  });
});
