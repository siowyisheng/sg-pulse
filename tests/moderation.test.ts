import { describe, expect, it } from "vitest";
import { createTestApp } from "@/testing/harness";

const person = (n: number) => ({ subject: `s-${n}`, name: "TAN AH KOW", dateOfBirth: "1990-05-01", sex: "M" });
const ADMIN = { subject: "s-admin", name: "SIOW YI SHENG", dateOfBirth: "1988-02-03", sex: "M" };

describe("a User Reports a Candidate", () => {
  it("hides it from browsing at once and queues it for the Admin, who clears it back into the pool", async () => {
    const { app, signUp, signUpAdmin } = await createTestApp({ now: "2026-11-12T09:00:00+08:00" });
    const writer = await signUp(person(1));
    await writer.me.submitFeeling({ text: "Perfectly innocent", polarity: "good", hashtag: "kopi" });
    const [candidate] = await app.candidates({ polarity: "good", hashtag: "kopi" });
    const voter = await signUp(person(2));
    await voter.me.upvote(candidate!.id);

    const reporter = await signUp(person(3));
    await reporter.me.report(candidate!.id);

    expect(await app.candidates({ polarity: "good", hashtag: "kopi" })).toEqual([]);
    expect(await app.wordCloud("good")).toEqual([]);
    expect((await writer.me.myFeelings())[0]?.state).toBe("under-review");
    const admin = (await signUpAdmin(ADMIN)).me.asAdmin();
    expect(await admin.reports()).toMatchObject([{ feelingId: candidate!.id, text: "Perfectly innocent", hashtag: "kopi", polarity: "good", yahLahs: 1 }]);

    await admin.clearReport(candidate!.id);

    expect((await app.candidates({ polarity: "good", hashtag: "kopi" })).map((c) => c.text)).toEqual(["Perfectly innocent"]);
    expect(await admin.reports()).toEqual([]);
    // Its Upvote was never lost.
    expect((await admin.approvalChoices()).good.choices[0]).toMatchObject({ text: "Perfectly innocent", yahLahs: 1 });
  });
});
