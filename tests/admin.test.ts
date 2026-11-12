import { describe, expect, it } from "vitest";
import { createTestApp } from "@/testing/harness";

const ADMIN = { subject: "s-admin", name: "SIOW YI SHENG", dateOfBirth: "1988-02-03", sex: "M" };

describe("an Admin enters Seed Feelings", () => {
  it("schedules one for tomorrow, and it becomes the Feeling of the Day at 00:00 SGT, from the team", async () => {
    const { app, signUpAdmin, clock } = await createTestApp({ now: "2026-11-12T22:00:00+08:00" });
    const { me } = await signUpAdmin(ADMIN);

    await me.asAdmin().scheduleSeedFeeling({ cycle: "2026-11-13", polarity: "good", text: "Kopi with the neighbours", hashtag: "#Kopi" });

    expect((await app.feelingsOfTheDay()).good).toBeNull();
    clock.set("2026-11-12T23:59:00+08:00");
    expect((await app.feelingsOfTheDay()).good).toBeNull();
    clock.set("2026-11-13T00:00:00+08:00");
    expect((await app.feelingsOfTheDay()).good).toMatchObject({ polarity: "good", text: "Kopi with the neighbours", hashtag: "kopi", fromTheTeam: true, byline: null, yahLahs: null, carriedOver: false });
  });
});
