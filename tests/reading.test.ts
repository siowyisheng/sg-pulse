import { describe, expect, it } from "vitest";
import { createTestApp } from "@/testing/harness";

describe("a Visitor reads the Feelings of the Day", () => {
  it("shows today's Good and Bad Feeling, each with its Hashtag, and Seed Feelings as from the team", async () => {
    const { app } = await createTestApp({ now: "2026-11-12T09:00:00+08:00" });
    await app.operator.scheduleSeedFeeling({ cycle: "2026-11-12", polarity: "good", text: "Kopi at the void deck with the uncles", hashtag: "kopi" });
    await app.operator.scheduleSeedFeeling({ cycle: "2026-11-12", polarity: "bad", text: "Train delay again this morning", hashtag: "mrt" });

    const today = await app.feelingsOfTheDay();

    expect(today).toEqual({
      cycle: "2026-11-12",
      good: { polarity: "good", text: "Kopi at the void deck with the uncles", hashtag: "kopi", fromTheTeam: true, byline: null },
      bad: { polarity: "bad", text: "Train delay again this morning", hashtag: "mrt", fromTheTeam: true, byline: null },
    });
  });
});
