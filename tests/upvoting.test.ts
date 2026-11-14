import { describe, expect, it } from "vitest";
import { createTestApp } from "@/testing/harness";

const person = (n: number) => ({ subject: `s-${n}`, name: "TAN AH KOW", dateOfBirth: "1990-05-01", sex: "M" });

describe("a User says Yah Lah to a Candidate", () => {
  it("has one Upvote for the Cycle, which the screen marks, and can move it or take it back", async () => {
    const { app, signUp } = await createTestApp({ now: "2026-11-12T09:00:00+08:00" });
    await (await signUp(person(1))).me.submitFeeling({ text: "Got a seat on the train", polarity: "good", hashtag: "mrt" });
    await (await signUp(person(2))).me.submitFeeling({ text: "Train broke down again", polarity: "bad", hashtag: "mrt" });
    const { me } = await signUp(person(3));
    const [good] = await app.candidates({ polarity: "good", hashtag: "mrt" });
    const [bad] = await app.candidates({ polarity: "bad", hashtag: "mrt" });

    await me.upvote(good!.id);
    expect(await me.myUpvote()).toEqual({ feelingId: good!.id, text: "Got a seat on the train", polarity: "good", hashtag: "mrt" });
    expect((await me.candidates({ polarity: "good", hashtag: "mrt" }))[0]).toMatchObject({ id: good!.id, hasMyUpvote: true, mine: false });

    // One Upvote across Good and Bad: saying Yah Lah to another Candidate moves it.
    await me.upvote(bad!.id);
    expect((await me.myUpvote())?.feelingId).toBe(bad!.id);
    expect((await me.candidates({ polarity: "good", hashtag: "mrt" }))[0]?.hasMyUpvote).toBe(false);

    await me.undoUpvote();
    expect(await me.myUpvote()).toBeNull();
  });
});

describe("going through a Polarity's Candidates one by one", () => {
  it("brings every Candidate of that mood from every Hashtag, with the User's own marks, for them to Yah Lah or skip", async () => {
    const world = await createTestApp({ now: "2026-11-12T09:00:00+08:00" });
    const person = (n: number) => ({ subject: `o-${n}`, name: "TAN AH KOW", dateOfBirth: "1990-05-01", sex: "M" });
    const reader = await world.signUp(person(0));
    await reader.me.submitFeeling({ text: "My own good one", polarity: "good", hashtag: "kopi" });
    const seat = await (await world.signUp(person(1))).me.submitFeeling({ text: "Got a seat", polarity: "good", hashtag: "mrt" });
    await (await world.signUp(person(2))).me.submitFeeling({ text: "Prata was crispy", polarity: "good", hashtag: "hawker" });
    await (await world.signUp(person(3))).me.submitFeeling({ text: "Train broke down", polarity: "bad", hashtag: "mrt" });

    await reader.me.upvote(seat.id);
    const stack = await reader.me.oneByOne("good");

    expect(stack.map(({ text, hashtag, mine, hasMyUpvote }) => ({ text, hashtag, mine, hasMyUpvote })).sort((a, b) => a.text.localeCompare(b.text))).toEqual([
      { text: "Got a seat", hashtag: "mrt", mine: false, hasMyUpvote: true },
      { text: "My own good one", hashtag: "kopi", mine: true, hasMyUpvote: false },
      { text: "Prata was crispy", hashtag: "hawker", mine: false, hasMyUpvote: false },
    ]);
    expect((await world.app.oneByOne("good")).map((candidate) => candidate.text).sort()).toEqual(["Got a seat", "My own good one", "Prata was crispy"]);
  });
});
