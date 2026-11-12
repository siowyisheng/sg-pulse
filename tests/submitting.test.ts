import { describe, expect, it } from "vitest";
import { createTestApp } from "@/testing/harness";

const TAN = { subject: "s-tan", name: "TAN AH KOW", dateOfBirth: "1990-05-01", sex: "M" };

describe("a User submits a Feeling", () => {
  it("becomes a Candidate of today's Cycle, with its Hashtag normalised and in use for others to pick", async () => {
    const { app, signUp } = await createTestApp({ now: "2026-11-12T09:00:00+08:00" });
    const { me } = await signUp(TAN);
    expect(await me.submission()).toEqual({ cycle: "2026-11-12", canSubmit: true, queued: false });

    const feeling = await me.submitFeeling({ text: "  Finally got a seat on the train  ", polarity: "good", hashtag: " #MRT " });

    expect(feeling).toMatchObject({ text: "Finally got a seat on the train", polarity: "good", hashtag: "mrt", cycle: "2026-11-12", state: "candidate", removalRequested: false });
    expect(await me.myFeelings()).toEqual([feeling]);
    expect(await app.hashtagsInUse()).toEqual(["mrt"]);
    expect(await me.submission()).toEqual({ cycle: "2026-11-12", canSubmit: false, queued: false });
  });
});
