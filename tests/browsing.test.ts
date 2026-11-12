import { describe, expect, it } from "vitest";
import { createTestApp } from "@/testing/harness";

const person = (n: number, name = "TAN AH KOW") => ({ subject: `s-${n}`, name, dateOfBirth: "1990-05-01", sex: "M" });

describe("a Visitor browses today's Candidates", () => {
  it("sees a word cloud for each Polarity, then the Candidates under a Hashtag with their Bylines and no counts", async () => {
    const { app, signUp } = await createTestApp({ now: "2026-11-12T09:00:00+08:00" });
    await (await signUp(person(1))).me.submitFeeling({ text: "Got a seat on the train", polarity: "good", hashtag: "mrt" });
    await (await signUp(person(2, "LIM MEI LING"))).me.submitFeeling({ text: "Train on time for once", polarity: "good", hashtag: "MRT" });
    await (await signUp(person(3))).me.submitFeeling({ text: "Kopi was perfect", polarity: "good", hashtag: "kopi" });
    await (await signUp(person(4))).me.submitFeeling({ text: "Train broke down again", polarity: "bad", hashtag: "mrt" });

    expect(await app.wordCloud("good")).toEqual([
      { hashtag: "mrt", feelings: 2, size: 5 },
      { hashtag: "kopi", feelings: 1, size: 3 },
    ]);
    expect(await app.wordCloud("bad")).toEqual([{ hashtag: "mrt", feelings: 1, size: 5 }]);

    const candidates = await app.candidates({ polarity: "good", hashtag: "#MRT" });
    expect(candidates.map(({ id: _id, ...candidate }) => candidate).sort((a, b) => a.text.localeCompare(b.text))).toEqual([
      { text: "Got a seat on the train", polarity: "good", hashtag: "mrt", byline: { initials: "TA", sex: "M", ageBand: "30s" } },
      { text: "Train on time for once", polarity: "good", hashtag: "mrt", byline: { initials: "LM", sex: "M", ageBand: "30s" } },
    ]);
  });
});
