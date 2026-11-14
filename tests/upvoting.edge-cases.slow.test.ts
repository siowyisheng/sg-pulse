import { describe, expect, it } from "vitest";
import { createTestApp } from "@/testing/harness";

const NOW = "2026-11-12T09:00:00+08:00";
const person = (n: number) => ({ subject: `s-${n}`, name: "TAN AH KOW", dateOfBirth: "1990-05-01", sex: "M" });

/** A world with Candidates written by other people, and one more User (the voter). */
async function worldWith(feelings: [text: string, polarity: "good" | "bad", hashtag: string][], now = NOW) {
  const world = await createTestApp({ now });
  for (const [index, [text, polarity, hashtag]] of feelings.entries()) {
    await (await world.signUp(person(index + 1))).me.submitFeeling({ text, polarity, hashtag });
  }
  const voter = await world.signUp(person(100));
  const idOf = async (text: string) => {
    const [, polarity, hashtag] = feelings.find(([t]) => t === text)!;
    return (await world.app.candidates({ polarity, hashtag })).find((c) => c.text === text)!.id;
  };
  return { ...world, voter, idOf };
}

describe("one Upvote per User per Cycle", () => {
  it("moves within a Polarity too, and saying Yah Lah twice to the same Candidate changes nothing", async () => {
    const { voter, idOf, tally } = await worldWith([
      ["First", "good", "a"],
      ["Second", "good", "a"],
    ]);
    await voter.me.upvote(await idOf("First"));
    await voter.me.upvote(await idOf("First"));
    expect(await tally()).toEqual({ First: 1 });
    await voter.me.upvote(await idOf("Second"));
    expect(await tally()).toEqual({ Second: 1 });
  });

  it("counts each User's Upvote once, and one User's move or undo leaves the others' alone", async () => {
    const { voter, signUp, idOf, tally } = await worldWith([
      ["Good one", "good", "a"],
      ["Bad one", "bad", "b"],
    ]);
    const other = await signUp(person(101));
    await voter.me.upvote(await idOf("Good one"));
    await other.me.upvote(await idOf("Good one"));
    expect(await tally()).toEqual({ "Good one": 2 });
    await voter.me.upvote(await idOf("Bad one"));
    expect(await tally()).toEqual({ "Good one": 1, "Bad one": 1 });
    await other.me.undoUpvote();
    expect(await tally()).toEqual({ "Bad one": 1 });
  });

  it("holds when the same User says Yah Lah to two Candidates at the same moment", async () => {
    const { voter, idOf, tally } = await worldWith([
      ["First", "good", "a"],
      ["Second", "bad", "a"],
    ]);
    await Promise.all([voter.me.upvote(await idOf("First")), voter.me.upvote(await idOf("Second"))]);
    expect(Object.values(await tally())).toEqual([1]);
  });

  it("is fine to undo when there is nothing to undo", async () => {
    const { voter } = await worldWith([["First", "good", "a"]]);
    await voter.me.undoUpvote();
    expect(await voter.me.myUpvote()).toBeNull();
  });
});

describe("what can't be Upvoted", () => {
  it("is your own Feeling", async () => {
    const { signUp, app, tally } = await createTestApp({ now: NOW });
    const { me } = await signUp(person(1));
    await me.submitFeeling({ text: "Mine", polarity: "good", hashtag: "a" });
    const [mine] = await app.candidates({ polarity: "good", hashtag: "a" });
    await expect(me.upvote(mine!.id)).rejects.toMatchObject({ code: "OWN_FEELING" });
    expect(await tally()).toEqual({});
    expect((await me.candidates({ polarity: "good", hashtag: "a" }))[0]).toMatchObject({ mine: true, hasMyUpvote: false });
  });

  it("is a Feeling still queued for tomorrow, a Seed Feeling, or something that isn't a Feeling", async () => {
    const { app, signUp, clock, everythingStored } = await createTestApp({ now: "2026-11-12T21:30:00+08:00" });
    await (await signUp(person(1))).me.submitFeeling({ text: "Queued", polarity: "good", hashtag: "a" });
    await app.operator.scheduleSeedFeeling({ cycle: "2026-11-13", polarity: "good", text: "Seed", hashtag: "a" });
    const stored = JSON.parse(await everythingStored()) as { id?: string; text?: string }[][];
    const idOf = (text: string) => stored.flat().find((row) => row.text === text)!.id!;
    const { me } = await signUp(person(2));
    await expect(me.upvote(idOf("Queued"))).rejects.toMatchObject({ code: "NOT_A_CANDIDATE" });
    await expect(me.upvote("not-an-id")).rejects.toMatchObject({ code: "NOT_A_CANDIDATE" });
    await expect(me.upvote("11111111-1111-4111-8111-111111111111")).rejects.toMatchObject({ code: "NOT_A_CANDIDATE" });

    clock.set("2026-11-13T00:00:00+08:00");
    await expect(me.upvote(idOf("Seed"))).rejects.toMatchObject({ code: "NOT_A_CANDIDATE" });
    await me.upvote(idOf("Queued"));
    expect((await me.myUpvote())?.text).toBe("Queued");
  });

  it("keeps the Upvote where it was when a move is refused", async () => {
    const { voter, idOf } = await worldWith([["First", "good", "a"]]);
    await voter.me.upvote(await idOf("First"));
    await expect(voter.me.upvote("11111111-1111-4111-8111-111111111111")).rejects.toMatchObject({ code: "NOT_A_CANDIDATE" });
    expect((await voter.me.myUpvote())?.text).toBe("First");
  });
});

describe("the Cycle boundary at 00:00 SGT", () => {
  it("closes yesterday's voting: the Upvote stands, can no longer be moved onto yesterday's Candidates or undone, and today's is fresh", async () => {
    const { app, voter, signUp, idOf, clock, tally } = await worldWith([["Thursday's", "good", "a"]], "2026-11-12T20:00:00+08:00");
    const thursdays = await idOf("Thursday's");
    clock.set("2026-11-12T23:59:00+08:00");
    await voter.me.upvote(thursdays);

    clock.set("2026-11-13T00:00:00+08:00");
    expect(await voter.me.myUpvote()).toBeNull();
    await voter.me.undoUpvote();
    expect(await tally("2026-11-12")).toEqual({ "Thursday's": 1 });
    const late = await signUp(person(102));
    await expect(late.me.upvote(thursdays)).rejects.toMatchObject({ code: "NOT_A_CANDIDATE" });

    // A new Cycle, a new Upvote; yesterday's is untouched by it.
    await late.me.submitFeeling({ text: "Friday's", polarity: "bad", hashtag: "b" });
    const [fridays] = await app.candidates({ polarity: "bad", hashtag: "b" });
    await voter.me.upvote(fridays!.id);
    expect((await voter.me.myUpvote())?.text).toBe("Friday's");
    expect(await tally("2026-11-12")).toEqual({ "Thursday's": 1 });
    expect(await tally("2026-11-13")).toEqual({ "Friday's": 1 });
  });

  it("can be undone at 23:59", async () => {
    const { voter, idOf, clock, tally } = await worldWith([["Thursday's", "good", "a"]]);
    await voter.me.upvote(await idOf("Thursday's"));
    clock.set("2026-11-12T23:59:00+08:00");
    await voter.me.undoUpvote();
    expect(await tally()).toEqual({});
  });
});

describe("counts stay hidden", () => {
  it("shows nothing about Upvotes to anyone browsing: not a count, not an order, not a bigger word", async () => {
    const { app, voter, signUp, idOf } = await worldWith([
      ["Popular", "good", "a"],
      ["Quiet", "good", "b"],
    ]);
    const before = { cloud: await app.wordCloud("good"), keys: Object.keys((await app.candidates({ polarity: "good", hashtag: "a" }))[0]!).sort() };
    await voter.me.upvote(await idOf("Popular"));
    await (await signUp(person(101))).me.upvote(await idOf("Popular"));

    expect(await app.wordCloud("good")).toEqual(before.cloud);
    expect(Object.keys((await app.candidates({ polarity: "good", hashtag: "a" }))[0]!).sort()).toEqual(before.keys);
    // Standing (Rising or New) is the one thing Upvotes may move, and it is never a count.
    expect(before.keys).toEqual(["byline", "hashtag", "id", "polarity", "standing", "text"]);
    // A User sees only their own mark, never anyone else's or a total.
    const third = await signUp(person(102));
    expect((await third.me.candidates({ polarity: "good", hashtag: "a" }))[0]).toMatchObject({ hasMyUpvote: false, mine: false });
    expect(Object.keys((await third.me.candidates({ polarity: "good", hashtag: "a" }))[0]!).sort()).toEqual(["byline", "hasMyUpvote", "hashtag", "id", "mine", "polarity", "standing", "text"]);
  });
});

describe("one by one, at the edges", () => {
  it("brings all of a Polarity's Candidates even past the 10 a Hashtag list shows, each once, and drops one that is Reported", async () => {
    const world = await createTestApp({ now: "2026-11-12T09:00:00+08:00" });
    const someone = (n: number) => ({ subject: `e-${n}`, name: "TAN AH KOW", dateOfBirth: "1990-05-01", sex: "M" });
    const ids: string[] = [];
    for (let n = 0; n < 12; n++) ids.push((await (await world.signUp(someone(n))).me.submitFeeling({ text: `Good ${n}`, polarity: "good", hashtag: n % 2 ? "kopi" : "mrt" })).id);

    const all = await world.app.oneByOne("good");
    expect(all).toHaveLength(12);
    expect(new Set(all.map((candidate) => candidate.id)).size).toBe(12);
    // One jumble: wherever it falls, a Candidate with no Upvotes yet is New, so position says nothing.
    expect(all.every((candidate) => candidate.standing === "new")).toBe(true);

    await (await world.signUp(someone(99))).me.report(ids[0]!);
    expect((await world.app.oneByOne("good")).map((candidate) => candidate.id)).not.toContain(ids[0]);
    expect(await world.app.oneByOne("bad")).toEqual([]);
  });
});
