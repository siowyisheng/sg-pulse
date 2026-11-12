import { describe, expect, it } from "vitest";
import { createTestApp } from "@/testing/harness";

describe("a Visitor looks back and shares", () => {
  it("finds past Feelings of the Day newest first with Byline and final count, and a share preview with no Byline", async () => {
    const { app, signUp, signUpAdmin, clock } = await createTestApp({ now: "2026-11-12T09:00:00+08:00" });
    await app.operator.scheduleSeedFeeling({ cycle: "2026-11-12", polarity: "good", text: "From the team on Thursday", hashtag: "seed" });
    const writer = await signUp({ subject: "s-1", name: "TAN AH KOW", dateOfBirth: "1990-05-01", sex: "M" });
    await writer.me.submitFeeling({ text: "Got a seat on the train", polarity: "good", hashtag: "mrt" });
    const [candidate] = await app.candidates({ polarity: "good", hashtag: "mrt" });
    await (await signUp({ subject: "s-2", name: "LIM MEI LING", dateOfBirth: "1985-07-09", sex: "F" })).me.upvote(candidate!.id);
    await (await signUpAdmin({ subject: "s-admin", name: "SIOW YI SHENG", dateOfBirth: "1988-02-03", sex: "M" })).me.asAdmin().approve(candidate!.id);

    clock.set("2026-11-14T09:00:00+08:00");
    expect(await app.archive()).toMatchObject([
      { cycle: "2026-11-13", polarity: "good", text: "Got a seat on the train", hashtag: "mrt", byline: { initials: "TA", sex: "M", ageBand: "30s" }, yahLahs: 1, fromTheTeam: false },
      { cycle: "2026-11-12", polarity: "good", text: "From the team on Thursday", hashtag: "seed", byline: null, yahLahs: null, fromTheTeam: true },
    ]);
    expect(await app.sharePreview("2026-11-13", "good")).toEqual({ text: "Got a seat on the train", hashtag: "mrt", polarity: "good" });
  });
});
