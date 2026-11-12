import { describe, expect, it } from "vitest";
import { createTestApp } from "@/testing/harness";

const person = (n: number) => ({ subject: `s-${n}`, name: "TAN AH KOW", dateOfBirth: "1990-05-01", sex: "M" });
const ADMIN = { subject: "s-admin", name: "SIOW YI SHENG", dateOfBirth: "1988-02-03", sex: "M" };
const MORNING = "2026-11-12T09:00:00+08:00";

/** Thursday morning: these Good Candidates under #tag with these Upvotes, an Admin, and a spare User. */
async function worldWith(candidates: Record<string, number>, polarity: "good" | "bad" = "good") {
  const world = await createTestApp({ now: MORNING });
  let people = 0;
  const ids: Record<string, string> = {};
  const writers: Record<string, Awaited<ReturnType<typeof world.signUp>>["me"]> = {};
  for (const text of Object.keys(candidates)) {
    writers[text] = (await world.signUp(person(++people))).me;
    await writers[text]!.submitFeeling({ text, polarity, hashtag: "tag" });
    ids[text] = (await world.app.candidates({ polarity, hashtag: "tag" })).find((c) => c.text === text)!.id;
    world.clock.advance({ minutes: 1 });
  }
  for (const [text, upvotes] of Object.entries(candidates)) {
    for (let i = 0; i < upvotes; i++) await (await world.signUp(person(++people))).me.upvote(ids[text]!);
  }
  const admin = (await world.signUpAdmin(ADMIN)).me.asAdmin();
  const newUser = async () => (await world.signUp(person(++people))).me;
  const browsing = async () => (await world.app.candidates({ polarity, hashtag: "tag" })).map((c) => c.text).sort();
  return { ...world, ids, writers, admin, newUser, browsing };
}

describe("Reporting", () => {
  it("can't be done to your own Feeling, to something that isn't a Candidate, or twice", async () => {
    const world = await worldWith({ Mine: 0 });
    await expect(world.writers.Mine!.report(world.ids.Mine!)).rejects.toMatchObject({ code: "OWN_FEELING" });
    const reporter = await world.newUser();
    await expect(reporter.report("11111111-1111-4111-8111-111111111111")).rejects.toMatchObject({ code: "NOT_A_CANDIDATE" });
    await expect(reporter.report("nonsense")).rejects.toMatchObject({ code: "NOT_A_CANDIDATE" });
    await reporter.report(world.ids.Mine!);
    // Someone with the page still open Reports it too: nothing more happens, and only the first Report is on record.
    await (await world.newUser()).report(world.ids.Mine!);
    expect(await world.admin.reports()).toHaveLength(1);
  });

  it("keeps the Upvotes a Reported Feeling has, shows them to the voter, and takes no new ones while it is under review", async () => {
    const world = await worldWith({ Reported: 1 });
    const voter = await world.newUser();
    await voter.upvote(world.ids.Reported!);
    await (await world.newUser()).report(world.ids.Reported!);
    expect(await world.tally()).toEqual({ Reported: 2 });
    expect((await voter.myUpvote())?.text).toBe("Reported");
    await expect((await world.newUser()).upvote(world.ids.Reported!)).rejects.toMatchObject({ code: "NOT_A_CANDIDATE" });
  });

  it("is refused for a Seed Feeling and for yesterday's Candidates", async () => {
    const world = await worldWith({ "Thursday's": 0 });
    world.clock.set("2026-11-13T00:00:00+08:00");
    await expect((await world.newUser()).report(world.ids["Thursday's"]!)).rejects.toMatchObject({ code: "NOT_A_CANDIDATE" });
  });
});

describe("a Feeling under review when the Cycle closes", () => {
  it("cannot win: a Report at 23:55 on the approved Candidate voids the Approval, and the Carry-over stands", async () => {
    const world = await worldWith({ Leader: 3, "Runner-up": 1 });
    await world.app.operator.scheduleSeedFeeling({ cycle: "2026-11-12", polarity: "good", text: "Thursday's Feeling", hashtag: "seed" });
    await world.admin.approve(world.ids.Leader!);

    world.clock.set("2026-11-12T23:55:00+08:00");
    await (await world.newUser()).report(world.ids.Leader!);
    expect((await world.admin.approvalChoices()).good).toMatchObject({ approvedId: null, choices: [{ text: "Runner-up" }] });

    world.clock.set("2026-11-13T00:00:00+08:00");
    expect((await world.app.feelingsOfTheDay()).good).toMatchObject({ text: "Thursday's Feeling", carriedOver: true });
  });

  it("is not crowned when it is cleared after the close, and its Submitter sees it expired", async () => {
    const world = await worldWith({ Leader: 3 });
    await world.admin.approve(world.ids.Leader!);
    world.clock.set("2026-11-12T23:55:00+08:00");
    await (await world.newUser()).report(world.ids.Leader!);

    world.clock.set("2026-11-13T08:00:00+08:00");
    expect(await world.admin.reports()).toHaveLength(1);
    await world.admin.clearReport(world.ids.Leader!);
    expect((await world.app.feelingsOfTheDay()).good).toBeNull();
    expect((await world.writers.Leader!.myFeelings())[0]?.state).toBe("expired");
    await expect(world.admin.approve(world.ids.Leader!)).rejects.toMatchObject({ code: "NOT_A_CHOICE" });
  });

  it("can still win when it is cleared before the close and approved again", async () => {
    const world = await worldWith({ Leader: 3 });
    await world.admin.approve(world.ids.Leader!);
    world.clock.set("2026-11-12T23:50:00+08:00");
    await (await world.newUser()).report(world.ids.Leader!);
    world.clock.set("2026-11-12T23:58:00+08:00");
    await world.admin.clearReport(world.ids.Leader!);
    await world.admin.approve(world.ids.Leader!);
    world.clock.set("2026-11-13T00:00:00+08:00");
    expect((await world.app.feelingsOfTheDay()).good).toMatchObject({ text: "Leader", yahLahs: 3 });
  });

  it("is left out of the top three, so the Admin can't approve it by mistake", async () => {
    const world = await worldWith({ A: 3, B: 2, C: 1, D: 0 });
    await (await world.newUser()).report(world.ids.A!);
    expect((await world.admin.approvalChoices()).good.choices.map((c) => c.text)).toEqual(["B", "C", "D"]);
    await expect(world.admin.approve(world.ids.A!)).rejects.toMatchObject({ code: "NOT_A_CHOICE" });
  });
});

describe("Timeout", () => {
  it("follows a Report judged innocent: one week without Reporting, and nothing else is restricted", async () => {
    const world = await worldWith({ Innocent: 0, Another: 0 });
    const reporter = await world.signUp(person(900));
    await reporter.me.report(world.ids.Innocent!);
    await world.admin.clearReport(world.ids.Innocent!);

    const now = (await world.app.authenticate(reporter.session.token))!;
    expect(now.reportingTimedOutUntil).toEqual(new Date("2026-11-19T09:02:00+08:00"));
    await expect(now.report(world.ids.Another!)).rejects.toMatchObject({ code: "TIMED_OUT" });
    expect(await world.browsing()).toEqual(["Another", "Innocent"]);
    // Only Reporting is off.
    await now.upvote(world.ids.Another!);
    await now.submitFeeling({ text: "Still allowed", polarity: "bad", hashtag: "ok" });

    world.clock.set("2026-11-19T09:01:00+08:00");
    await expect((await world.app.authenticate(reporter.session.token))!.report(world.ids.Another!)).rejects.toMatchObject({ code: "TIMED_OUT" });
    world.clock.set("2026-11-19T09:02:00+08:00");
    expect((await world.app.authenticate(reporter.session.token))!.reportingTimedOutUntil).toBeNull();
  });

  it("does not follow a Report the Admin upholds, and can be waived or set to another length", async () => {
    const world = await worldWith({ Bad: 0, Borderline: 0, Fine: 0 });
    const right = await world.signUp(person(901));
    await right.me.report(world.ids.Bad!);
    await world.admin.takeDown(world.ids.Bad!);
    expect((await world.app.authenticate(right.session.token))!.reportingTimedOutUntil).toBeNull();

    await right.me.report(world.ids.Borderline!);
    await world.admin.clearReport(world.ids.Borderline!, { timeoutDays: 0 });
    expect((await world.app.authenticate(right.session.token))!.reportingTimedOutUntil).toBeNull();

    await right.me.report(world.ids.Fine!);
    await world.admin.clearReport(world.ids.Fine!, { timeoutDays: 2 });
    expect((await world.app.authenticate(right.session.token))!.reportingTimedOutUntil).toEqual(new Date("2026-11-14T09:03:00+08:00"));
  });
});

describe("Take-down", () => {
  it("of a Candidate removes it for good, and the next most-upvoted moves up", async () => {
    const world = await worldWith({ First: 3, Second: 2, Third: 1, Fourth: 0 });
    await world.admin.takeDown(world.ids.First!);
    expect(await world.browsing()).toEqual(["Fourth", "Second", "Third"]);
    expect((await world.admin.approvalChoices()).good.choices.map((c) => c.text)).toEqual(["Second", "Third", "Fourth"]);
    expect((await world.writers.First!.myFeelings())[0]?.state).toBe("removed");
    await expect((await world.newUser()).upvote(world.ids.First!)).rejects.toMatchObject({ code: "NOT_A_CANDIDATE" });
  });

  it("of a Reported Feeling settles the Report", async () => {
    const world = await worldWith({ Bad: 0 });
    await (await world.newUser()).report(world.ids.Bad!);
    await world.admin.takeDown(world.ids.Bad!);
    expect(await world.admin.reports()).toEqual([]);
    expect(await world.browsing()).toEqual([]);
  });

  it("of the Candidate approved for tomorrow withdraws the Approval, for the Admin to choose again", async () => {
    const world = await worldWith({ First: 3, Second: 2 });
    await world.admin.approve(world.ids.First!);
    await world.admin.takeDown(world.ids.First!);
    expect((await world.admin.approvalChoices()).good).toMatchObject({ approvedId: null, choices: [{ text: "Second" }] });
    world.clock.set("2026-11-13T00:00:00+08:00");
    expect((await world.app.feelingsOfTheDay()).good).toBeNull();
  });

  it("of the Feeling of the Day puts the next most-upvoted of its Cycle in its place, with its own count", async () => {
    const world = await worldWith({ Winner: 3, "Runner-up": 2, Third: 1 });
    await world.admin.approve(world.ids.Winner!);
    world.clock.set("2026-11-13T10:00:00+08:00");
    const live = (await world.app.feelingsOfTheDay()).good!;
    expect(live).toMatchObject({ text: "Winner", yahLahs: 3 });

    await world.admin.takeDown(live.id);
    expect((await world.app.feelingsOfTheDay()).good).toMatchObject({ text: "Runner-up", yahLahs: 2, carriedOver: false });
    expect((await world.writers.Winner!.myFeelings())[0]?.state).toBe("removed");
    expect((await world.writers["Runner-up"]!.myFeelings())[0]?.state).toBe("winner");

    // And again, down the line; a Feeling that was under review at the close is passed over.
    await world.admin.takeDown((await world.app.feelingsOfTheDay()).good!.id);
    expect((await world.app.feelingsOfTheDay()).good).toMatchObject({ text: "Third", yahLahs: 1 });
  });

  it("of the Feeling of the Day falls back to the Carry-over when its Cycle has nobody left", async () => {
    const world = await worldWith({ Only: 1 });
    await world.app.operator.scheduleSeedFeeling({ cycle: "2026-11-12", polarity: "good", text: "Thursday's Feeling", hashtag: "seed" });
    await world.admin.approve(world.ids.Only!);
    world.clock.set("2026-11-13T10:00:00+08:00");
    await world.admin.takeDown((await world.app.feelingsOfTheDay()).good!.id);
    expect((await world.app.feelingsOfTheDay()).good).toMatchObject({ text: "Thursday's Feeling", carriedOver: true });
  });

  it("passes over a Feeling that was under review at the close when choosing the replacement", async () => {
    const world = await worldWith({ Winner: 3, "Under review": 2, Clean: 1 });
    await world.admin.approve(world.ids.Winner!);
    await (await world.newUser()).report(world.ids["Under review"]!);
    world.clock.set("2026-11-13T10:00:00+08:00");
    await world.admin.takeDown(world.ids.Winner!);
    expect((await world.app.feelingsOfTheDay()).good).toMatchObject({ text: "Clean" });
  });

  it("of a Seed Feeling of the Day leaves the Carry-over, or nothing", async () => {
    const world = await createTestApp({ now: MORNING });
    await world.app.operator.scheduleSeedFeeling({ cycle: "2026-11-12", polarity: "good", text: "Seed", hashtag: "seed" });
    const admin = (await world.signUpAdmin(ADMIN)).me.asAdmin();
    await admin.takeDown((await world.app.feelingsOfTheDay()).good!.id);
    expect((await world.app.feelingsOfTheDay()).good).toBeNull();
  });

  it("is for Admins only, and refuses what isn't a Feeling", async () => {
    const world = await worldWith({ A: 0 });
    expect(() => world.writers.A!.asAdmin()).toThrow(expect.objectContaining({ code: "NOT_ADMIN" }));
    await expect(world.admin.takeDown("nonsense")).rejects.toMatchObject({ code: "NO_SUCH_FEELING" });
    await expect(world.admin.clearReport(world.ids.A!)).rejects.toMatchObject({ code: "NOT_REPORTED" });
  });
});

describe("correction notices", () => {
  it("show on the Feeling of the Day, stay with it as a Carry-over and in the archive, and can be changed or lifted", async () => {
    const world = await worldWith({ Winner: 1 });
    await world.admin.approve(world.ids.Winner!);
    world.clock.set("2026-11-13T10:00:00+08:00");
    expect((await world.app.feelingsOfTheDay()).good?.correctionNotice).toBeNull();

    await world.admin.setCorrectionNotice(world.ids.Winner!, "  This Feeling contains a false statement of fact.\nSee gov.sg/factually.  ");
    expect((await world.app.feelingsOfTheDay()).good?.correctionNotice).toBe("This Feeling contains a false statement of fact. See gov.sg/factually.");

    world.clock.set("2026-11-14T10:00:00+08:00");
    expect((await world.app.feelingsOfTheDay()).good).toMatchObject({ carriedOver: true, correctionNotice: "This Feeling contains a false statement of fact. See gov.sg/factually." });
    expect((await world.app.archive())[0]).toMatchObject({ text: "Winner", correctionNotice: "This Feeling contains a false statement of fact. See gov.sg/factually." });

    await world.admin.setCorrectionNotice(world.ids.Winner!, "");
    expect((await world.app.feelingsOfTheDay()).good?.correctionNotice).toBeNull();
  });

  it("are limited in length, and only for a Feeling that exists", async () => {
    const world = await worldWith({ Winner: 1 });
    await expect(world.admin.setCorrectionNotice(world.ids.Winner!, "x".repeat(501))).rejects.toMatchObject({ code: "NOTICE_TOO_LONG" });
    await expect(world.admin.setCorrectionNotice("11111111-1111-4111-8111-111111111111", "Notice")).rejects.toMatchObject({ code: "NO_SUCH_FEELING" });
  });
});

describe("the audit log", () => {
  it("records Reports and every Admin action, newest first, with who did it", async () => {
    const world = await worldWith({ Winner: 2, Reported: 0, Bad: 0 });
    const adminMe = (await world.signUpAdmin(ADMIN)).me;
    const reporter = await world.newUser();
    await reporter.report(world.ids.Reported!);
    await world.admin.clearReport(world.ids.Reported!);
    await world.admin.approve(world.ids.Winner!);
    await world.admin.setCorrectionNotice(world.ids.Winner!, "Corrected");
    await world.admin.takeDown(world.ids.Bad!);

    const log = await world.admin.auditLog();
    expect(log.map((entry) => entry.action)).toEqual(["take-down", "correction-notice", "approve", "report-cleared", "report"]);
    expect(log[0]).toMatchObject({ actorId: adminMe.userId, feelingId: world.ids.Bad, at: new Date("2026-11-12T09:03:00+08:00") });
    expect(log[1]).toMatchObject({ detail: "Corrected" });
    expect(log[4]).toMatchObject({ actorId: reporter.userId, feelingId: world.ids.Reported });
  });
});
