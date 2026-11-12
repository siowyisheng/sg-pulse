import { describe, expect, it } from "vitest";
import { createTestApp } from "@/testing/harness";

describe("from a Feeling to the Feeling of the Day", () => {
  it("a User submits, another says Yah Lah, the Admin approves, and it is the Feeling of the Day at 00:00 with its final count", async () => {
    const { app, signUp, signUpAdmin, clock } = await createTestApp({ now: "2026-11-12T09:00:00+08:00" });
    const writer = await signUp({ subject: "s-1", name: "TAN AH KOW", dateOfBirth: "1990-05-01", sex: "M" });
    await writer.me.submitFeeling({ text: "Got a seat on the train", polarity: "good", hashtag: "mrt" });
    const voter = await signUp({ subject: "s-2", name: "LIM MEI LING", dateOfBirth: "1985-07-09", sex: "F" });
    const [candidate] = await app.candidates({ polarity: "good", hashtag: "mrt" });
    await voter.me.upvote(candidate!.id);

    clock.set("2026-11-12T22:00:00+08:00");
    const admin = (await signUpAdmin({ subject: "s-admin", name: "SIOW YI SHENG", dateOfBirth: "1988-02-03", sex: "M" })).me.asAdmin();
    const choices = await admin.approvalChoices();
    expect(choices).toMatchObject({ cycle: "2026-11-12", goesLive: "2026-11-13" });
    expect(choices.good.choices).toEqual([{ id: candidate!.id, text: "Got a seat on the train", hashtag: "mrt", byline: { initials: "TA", sex: "M", ageBand: "30s" }, yahLahs: 1 }]);
    await admin.approve(candidate!.id);

    // Nothing shows early.
    clock.set("2026-11-12T23:59:00+08:00");
    expect((await app.feelingsOfTheDay()).good).toBeNull();

    clock.set("2026-11-13T00:00:00+08:00");
    expect((await app.feelingsOfTheDay()).good).toEqual({
      polarity: "good",
      text: "Got a seat on the train",
      hashtag: "mrt",
      fromTheTeam: false,
      byline: { initials: "TA", sex: "M", ageBand: "30s" },
      yahLahs: 1,
      carriedOver: false,
    });
    expect((await writer.me.myFeelings())[0]?.state).toBe("winner");
  });
});
