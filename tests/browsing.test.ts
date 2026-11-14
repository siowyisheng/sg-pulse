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
      { text: "Got a seat on the train", polarity: "good", hashtag: "mrt", byline: { initials: "TA", sex: "M", ageBand: "30s" }, standing: "new" },
      { text: "Train on time for once", polarity: "good", hashtag: "mrt", byline: { initials: "LM", sex: "M", ageBand: "30s" }, standing: "new" },
    ]);
  });
});

describe("why a Candidate is on the list", () => {
  it("marks one with a burst of recent Upvotes as Rising and one hardly upvoted as New, and says nothing of the rest", async () => {
    const world = await createTestApp({ now: "2026-11-12T01:00:00+08:00" });
    const write = async (n: number, text: string) => (await (await world.signUp(person(n))).me.submitFeeling({ text, polarity: "good", hashtag: "mrt" })).id;
    const steady = await write(1, "Seat on the train");
    const rising = await write(2, "Train came at once");
    await write(3, "Aircon cold today");
    const upvote = async (n: number, feelingId: string) => (await world.signUp(person(n))).me.upvote(feelingId);
    await upvote(10, steady);
    await upvote(11, steady);
    world.clock.set("2026-11-12T13:00:00+08:00");
    await upvote(12, rising);
    await upvote(13, rising);

    const standing = Object.fromEntries((await world.app.candidates({ polarity: "good", hashtag: "mrt" })).map((candidate) => [candidate.text, candidate.standing]));

    expect(standing).toEqual({ "Train came at once": "rising", "Aircon cold today": "new", "Seat on the train": undefined });
  });
});
