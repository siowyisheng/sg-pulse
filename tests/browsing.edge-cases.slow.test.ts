import { describe, expect, it } from "vitest";
import { createTestApp } from "@/testing/harness";

const NOW = "2026-11-12T09:00:00+08:00";
const person = (n: number) => ({ subject: `s-${n}`, name: "TAN AH KOW", dateOfBirth: "1990-05-01", sex: "M" });

/** A world where `counts[hashtag]` different Users have each submitted a Feeling with that Hashtag. */
async function worldWith(counts: Record<string, number>, polarity: "good" | "bad" = "good") {
  const world = await createTestApp({ now: NOW });
  let n = 0;
  for (const [hashtag, count] of Object.entries(counts)) {
    for (let i = 0; i < count; i++) {
      n++;
      await (await world.signUp(person(n))).me.submitFeeling({ text: `${hashtag} feeling ${i + 1}`, polarity, hashtag });
    }
  }
  return world;
}

describe("the word cloud", () => {
  it("sizes each Hashtag by its share of the most used one, in five steps, most used first", async () => {
    const { app } = await worldWith({ a: 10, b: 8, c: 5, d: 3, e: 1 });
    expect(await app.wordCloud("good")).toEqual([
      { hashtag: "a", feelings: 10, size: 5 },
      { hashtag: "b", feelings: 8, size: 4 },
      { hashtag: "c", feelings: 5, size: 3 },
      { hashtag: "d", feelings: 3, size: 2 },
      { hashtag: "e", feelings: 1, size: 1 },
    ]);
  });

  it("is the largest size throughout when every Hashtag is used equally, and breaks ties by name", async () => {
    const { app } = await worldWith({ zebra: 1, apple: 1 });
    expect(await app.wordCloud("good")).toEqual([
      { hashtag: "apple", feelings: 1, size: 5 },
      { hashtag: "zebra", feelings: 1, size: 5 },
    ]);
  });

  it("is empty when the Polarity has no Candidates, and for a Polarity that does not exist", async () => {
    const { app } = await worldWith({ a: 1 });
    expect(await app.wordCloud("bad")).toEqual([]);
    expect(await app.wordCloud("meh" as "good")).toEqual([]);
  });

  it("counts only the Cycle under way: not queued Feelings, not yesterday's, not Seed Feelings", async () => {
    const { app, signUp, clock } = await createTestApp({ now: "2026-11-12T20:00:00+08:00" });
    await app.operator.scheduleSeedFeeling({ cycle: "2026-11-12", polarity: "good", text: "From the team", hashtag: "seed" });
    await (await signUp(person(1))).me.submitFeeling({ text: "Before the cut-off", polarity: "good", hashtag: "early" });
    clock.set("2026-11-12T21:30:00+08:00");
    await (await signUp(person(2))).me.submitFeeling({ text: "After the cut-off", polarity: "good", hashtag: "late" });
    expect((await app.wordCloud("good")).map((word) => word.hashtag)).toEqual(["early"]);
    expect(await app.candidates({ polarity: "good", hashtag: "late" })).toEqual([]);

    clock.set("2026-11-13T00:00:00+08:00");
    expect((await app.wordCloud("good")).map((word) => word.hashtag)).toEqual(["late"]);
    expect(await app.candidates({ polarity: "good", hashtag: "early" })).toEqual([]);
    expect((await app.candidates({ polarity: "good", hashtag: "late" })).map((c) => c.text)).toEqual(["After the cut-off"]);
  });
});

describe("the Candidates under a Hashtag", () => {
  it("are all shown when there are 10 or fewer", async () => {
    const { app } = await worldWith({ mrt: 10 });
    const texts = (await app.candidates({ polarity: "good", hashtag: "mrt" })).map((c) => c.text);
    expect(texts).toHaveLength(10);
    expect([...texts].sort()).toEqual(Array.from({ length: 10 }, (_, i) => `mrt feeling ${i + 1}`).sort());
  });

  it("are at most 10 when there are more, and a different 10 can come up each time", async () => {
    const { app, random } = await worldWith({ mrt: 14 });
    random.seed(1);
    const first = (await app.candidates({ polarity: "good", hashtag: "mrt" })).map((c) => c.text);
    random.seed(2);
    const second = (await app.candidates({ polarity: "good", hashtag: "mrt" })).map((c) => c.text);
    expect(first).toHaveLength(10);
    expect(new Set(first).size).toBe(10);
    expect(second).toHaveLength(10);
    expect([...first].sort()).not.toEqual([...second].sort());
  });

  it("come in jumbled order: not the order they were written in, and not the same order every time", async () => {
    const { app, random } = await worldWith({ mrt: 8 });
    const written = Array.from({ length: 8 }, (_, i) => `mrt feeling ${i + 1}`);
    random.seed(1);
    const first = (await app.candidates({ polarity: "good", hashtag: "mrt" })).map((c) => c.text);
    random.seed(2);
    const second = (await app.candidates({ polarity: "good", hashtag: "mrt" })).map((c) => c.text);
    expect(first).not.toEqual(written);
    expect(first).not.toEqual(second);
    expect([...first].sort()).toEqual([...written].sort());
    // The same roll of the dice gives the same order: the jumble comes from the dice alone.
    random.seed(1);
    expect((await app.candidates({ polarity: "good", hashtag: "mrt" })).map((c) => c.text)).toEqual(first);
  });

  it("are only that Polarity's and that Hashtag's", async () => {
    const { app, signUp } = await worldWith({ mrt: 2, kopi: 1 });
    await (await signUp(person(99))).me.submitFeeling({ text: "Bad train", polarity: "bad", hashtag: "mrt" });
    expect((await app.candidates({ polarity: "good", hashtag: "mrt" })).map((c) => c.text).sort()).toEqual(["mrt feeling 1", "mrt feeling 2"]);
    expect((await app.candidates({ polarity: "bad", hashtag: "mrt" })).map((c) => c.text)).toEqual(["Bad train"]);
    expect(await app.candidates({ polarity: "good", hashtag: "nothing" })).toEqual([]);
    expect(await app.candidates({ polarity: "good", hashtag: "two words" })).toEqual([]);
  });

  it("carry the Submitter's Byline as it is today, and nothing else about them or about votes", async () => {
    const { app, signUp } = await createTestApp({ now: NOW });
    await (await signUp({ subject: "s-teen", name: "LIM WEI JIE", dateOfBirth: "2010-01-20", sex: "M" })).me.submitFeeling({ text: "Exams are over", polarity: "good", hashtag: "school" });
    const [candidate] = await app.candidates({ polarity: "good", hashtag: "school" });
    // "New" says it has hardly any Upvotes yet, which is why it is shown: never a count.
    expect(Object.keys(candidate!).sort()).toEqual(["byline", "hashtag", "id", "polarity", "standing", "text"]);
    expect(candidate!.standing).toBe("new");
    expect(candidate!.byline).toEqual({ initials: null, sex: "M", ageBand: "<18" });
  });
});
