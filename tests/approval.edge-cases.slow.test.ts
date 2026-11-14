import { describe, expect, it, vi } from "vitest";
import { createTestApp } from "@/testing/harness";

const person = (n: number) => ({ subject: `s-${n}`, name: "TAN AH KOW", dateOfBirth: "1990-05-01", sex: "M" });
const ADMIN = { subject: "s-admin", name: "SIOW YI SHENG", dateOfBirth: "1988-02-03", sex: "M" };
const MORNING = "2026-11-12T09:00:00+08:00";

/**
 * A world on Thursday 12 Nov where each entry is a Candidate with that many Upvotes, written in the
 * order given a minute apart, plus an Admin.
 */
async function worldWith(candidates: [text: string, polarity: "good" | "bad", upvotes: number][]) {
  const world = await createTestApp({ now: MORNING });
  const ids: Record<string, string> = {};
  let people = 0;
  for (const [text, polarity] of candidates) {
    await (await world.signUp(person(++people))).me.submitFeeling({ text, polarity, hashtag: "tag" });
    ids[text] = (await world.app.candidates({ polarity, hashtag: "tag" })).find((c) => c.text === text)!.id;
    world.clock.advance({ minutes: 1 });
  }
  const most = Math.max(0, ...candidates.map(([, , upvotes]) => upvotes));
  const voters = await Promise.all(Array.from({ length: most }, async () => (await world.signUp(person(++people))).me));
  const admin = (await world.signUpAdmin(ADMIN)).me.asAdmin();
  return { ...world, ids, admin, voters, people: () => ++people };
}

/** Gives each Candidate its Upvotes. One voter has one Upvote, so use this for one Candidate with votes per world, or `cast`. */
async function cast(world: Awaited<ReturnType<typeof worldWith>>, votes: Record<string, number>) {
  // Each voter has one Upvote a Cycle, so every Upvote needs its own voter.
  for (const [text, count] of Object.entries(votes)) {
    for (let i = 0; i < count; i++) {
      const { me } = await world.signUp(person(1000 + world.people()));
      await me.upvote(world.ids[text]!);
    }
  }
}

describe("the top three", () => {
  it("are the most upvoted Candidates of each Polarity, with ties going to the earliest written", async () => {
    const world = await worldWith([
      ["Early with two", "good", 0],
      ["Late with two", "good", 0],
      ["Three", "good", 0],
      ["One", "good", 0],
      ["None", "good", 0],
      ["Bad one", "bad", 0],
    ]);
    await cast(world, { "Late with two": 2, "Early with two": 2, Three: 3, One: 1, "Bad one": 1 });
    const choices = await world.admin.approvalChoices();
    expect(choices.good.choices.map((c) => `${c.text}: ${c.yahLahs}`)).toEqual(["Three: 3", "Early with two: 2", "Late with two: 2"]);
    expect(choices.bad.choices.map((c) => `${c.text}: ${c.yahLahs}`)).toEqual(["Bad one: 1"]);
    expect(choices.good.approvedId).toBeNull();
  });

  it("include Candidates nobody has upvoted when there are fewer than three with Upvotes, earliest first", async () => {
    const world = await worldWith([
      ["First", "good", 0],
      ["Second", "good", 0],
    ]);
    expect((await world.admin.approvalChoices()).good.choices.map((c) => c.text)).toEqual(["First", "Second"]);
    expect((await world.admin.approvalChoices()).bad.choices).toEqual([]);
  });

  it("are the only ones that can be approved", async () => {
    const world = await worldWith([
      ["A", "good", 0],
      ["B", "good", 0],
      ["C", "good", 0],
      ["Fourth", "good", 0],
    ]);
    await expect(world.admin.approve(world.ids.Fourth!)).rejects.toMatchObject({ code: "NOT_A_CHOICE" });
    await expect(world.admin.approve("11111111-1111-4111-8111-111111111111")).rejects.toMatchObject({ code: "NOT_A_CHOICE" });
    await expect(world.admin.approve("nonsense")).rejects.toMatchObject({ code: "NOT_A_CHOICE" });
    await world.admin.approve(world.ids.C!);
  });
});

describe("Approval", () => {
  it("can be changed or withdrawn until 00:00, and only the last choice goes live", async () => {
    const world = await worldWith([
      ["A", "good", 0],
      ["B", "good", 0],
    ]);
    await world.admin.approve(world.ids.A!);
    expect((await world.admin.approvalChoices()).good.approvedId).toBe(world.ids.A);
    await world.admin.approve(world.ids.B!);
    expect((await world.admin.approvalChoices()).good.approvedId).toBe(world.ids.B);
    await world.admin.withdrawApproval("good");
    expect((await world.admin.approvalChoices()).good.approvedId).toBeNull();
    await world.admin.approve(world.ids.A!);

    world.clock.set("2026-11-13T00:00:00+08:00");
    expect((await world.app.feelingsOfTheDay()).good?.text).toBe("A");
  });

  it("is one per Polarity: approving a Bad one leaves the Good one alone", async () => {
    const world = await worldWith([
      ["Good one", "good", 0],
      ["Bad one", "bad", 0],
    ]);
    await world.admin.approve(world.ids["Good one"]!);
    await world.admin.approve(world.ids["Bad one"]!);
    world.clock.set("2026-11-13T00:00:00+08:00");
    const today = await world.app.feelingsOfTheDay();
    expect([today.good?.text, today.bad?.text]).toEqual(["Good one", "Bad one"]);
  });

  it("made at 23:59 goes live at 00:00; at 00:01 it is too late and yesterday's Candidates can't be approved", async () => {
    const world = await worldWith([
      ["In time", "good", 0],
      ["Too late", "bad", 0],
    ]);
    world.clock.set("2026-11-12T23:59:00+08:00");
    await world.admin.approve(world.ids["In time"]!);

    world.clock.set("2026-11-13T00:01:00+08:00");
    await expect(world.admin.approve(world.ids["Too late"]!)).rejects.toMatchObject({ code: "NOT_A_CHOICE" });
    const today = await world.app.feelingsOfTheDay();
    expect(today.good?.text).toBe("In time");
    expect(today.bad).toBeNull();
    // The Admin is now looking at the new Cycle, and can't withdraw what has gone live.
    expect(await world.admin.approvalChoices()).toMatchObject({ cycle: "2026-11-13", goesLive: "2026-11-14", good: { choices: [], approvedId: null } });
    await world.admin.withdrawApproval("good");
    expect((await world.app.feelingsOfTheDay()).good?.text).toBe("In time");
  });

  it("counts every Yah Lah up to midnight, including those after the Approval", async () => {
    const world = await worldWith([["Winner", "good", 0]]);
    await cast(world, { Winner: 2 });
    await world.admin.approve(world.ids.Winner!);
    world.clock.set("2026-11-12T23:59:00+08:00");
    await cast(world, { Winner: 1 });
    world.clock.set("2026-11-13T00:00:00+08:00");
    expect((await world.app.feelingsOfTheDay()).good?.yahLahs).toBe(3);
  });

  it("takes the place of a Seed Feeling scheduled for the same day, and a Seed Feeling can't take the place of an Approval", async () => {
    const world = await worldWith([["Real one", "good", 0]]);
    await world.admin.scheduleSeedFeeling({ cycle: "2026-11-13", polarity: "good", text: "Seed", hashtag: "seed" });
    await world.admin.approve(world.ids["Real one"]!);
    await expect(world.admin.scheduleSeedFeeling({ cycle: "2026-11-13", polarity: "good", text: "Another seed", hashtag: "seed" })).rejects.toMatchObject({ code: "ALREADY_CHOSEN" });
    expect(await world.admin.scheduledSeedFeelings()).toEqual([]);
    world.clock.set("2026-11-13T00:00:00+08:00");
    expect((await world.app.feelingsOfTheDay()).good?.text).toBe("Real one");
  });

  it("is not something a Submitter or anyone else can see before 00:00", async () => {
    const world = await createTestApp({ now: MORNING });
    const writer = await world.signUp(person(1));
    await writer.me.submitFeeling({ text: "Mine", polarity: "good", hashtag: "tag" });
    const [candidate] = await world.app.candidates({ polarity: "good", hashtag: "tag" });
    await (await world.signUpAdmin(ADMIN)).me.asAdmin().approve(candidate!.id);
    expect((await writer.me.myFeelings())[0]?.state).toBe("candidate");
    // Its Standing ("new") says it has hardly any Upvotes; nothing says it was approved.
    expect(Object.keys((await world.app.candidates({ polarity: "good", hashtag: "tag" }))[0]!).sort()).toEqual(["byline", "hashtag", "id", "polarity", "standing", "text"]);
  });

  it("is for Admins only", async () => {
    const world = await createTestApp({ now: MORNING });
    const { me } = await world.signUp(person(1));
    expect(() => me.asAdmin()).toThrow(expect.objectContaining({ code: "NOT_ADMIN" }));
  });
});

describe("Carry-over", () => {
  it("keeps yesterday's Feeling up, marked still feeling it, when a Polarity has no Approval", async () => {
    const world = await worldWith([
      ["Thursday's good", "good", 0],
      ["Thursday's bad", "bad", 0],
    ]);
    await cast(world, { "Thursday's good": 2 });
    await world.admin.approve(world.ids["Thursday's good"]!);
    await world.admin.approve(world.ids["Thursday's bad"]!);

    // Friday: live. Nobody approves anything on Friday.
    world.clock.set("2026-11-13T12:00:00+08:00");
    expect((await world.app.feelingsOfTheDay()).good).toMatchObject({ text: "Thursday's good", carriedOver: false, yahLahs: 2 });

    // Saturday, and Sunday too: Friday's Feelings are still up, with the counts they won with.
    for (const day of ["2026-11-14T00:00:00+08:00", "2026-11-15T18:00:00+08:00"]) {
      world.clock.set(day);
      const today = await world.app.feelingsOfTheDay();
      expect(today.good).toMatchObject({ text: "Thursday's good", carriedOver: true, yahLahs: 2 });
      expect(today.bad).toMatchObject({ text: "Thursday's bad", carriedOver: true, yahLahs: 0 });
    }
  });

  it("applies to one Polarity while the other has a new Feeling", async () => {
    const world = await worldWith([
      ["Thursday's good", "good", 0],
      ["Thursday's bad", "bad", 0],
    ]);
    await world.admin.approve(world.ids["Thursday's good"]!);
    await world.admin.approve(world.ids["Thursday's bad"]!);
    world.clock.set("2026-11-13T09:00:00+08:00");
    await (await world.signUp(person(500))).me.submitFeeling({ text: "Friday's good", polarity: "good", hashtag: "tag" });
    const [fridays] = await world.app.candidates({ polarity: "good", hashtag: "tag" });
    await world.admin.approve(fridays!.id);

    world.clock.set("2026-11-14T00:00:00+08:00");
    const today = await world.app.feelingsOfTheDay();
    expect(today.good).toMatchObject({ text: "Friday's good", carriedOver: false });
    expect(today.bad).toMatchObject({ text: "Thursday's bad", carriedOver: true });
  });

  it("carries a Seed Feeling over too, still from the team", async () => {
    const world = await createTestApp({ now: MORNING });
    await world.app.operator.scheduleSeedFeeling({ cycle: "2026-11-12", polarity: "good", text: "Seed", hashtag: "seed" });
    world.clock.set("2026-11-13T00:00:00+08:00");
    expect((await world.app.feelingsOfTheDay()).good).toMatchObject({ polarity: "good", text: "Seed", hashtag: "seed", fromTheTeam: true, byline: null, yahLahs: null, carriedOver: true });
  });

  it("has nothing to carry on the very first day", async () => {
    const world = await createTestApp({ now: MORNING });
    expect(await world.app.feelingsOfTheDay()).toEqual({ cycle: "2026-11-12", good: null, bad: null });
  });
});

describe("losing Candidates", () => {
  it("expire at the end of the Cycle, and the winner does not", async () => {
    const world = await createTestApp({ now: MORNING });
    const winner = await world.signUp(person(1));
    const loser = await world.signUp(person(2));
    await winner.me.submitFeeling({ text: "Winner", polarity: "good", hashtag: "tag" });
    await loser.me.submitFeeling({ text: "Loser", polarity: "good", hashtag: "tag" });
    const id = (await world.app.candidates({ polarity: "good", hashtag: "tag" })).find((c) => c.text === "Winner")!.id;
    await (await world.signUpAdmin(ADMIN)).me.asAdmin().approve(id);
    world.clock.set("2026-11-13T00:00:00+08:00");
    expect((await winner.me.myFeelings())[0]?.state).toBe("winner");
    expect((await loser.me.myFeelings())[0]?.state).toBe("expired");
    expect(await world.app.candidates({ polarity: "good", hashtag: "tag" })).toEqual([]);
  });
});

describe("the Admin's reminder", () => {
  const subscription = (n: number) => ({ endpoint: `https://push.example/${n}`, p256dh: "key", auth: "auth" });

  it("goes to every Admin's devices when a Polarity with Candidates has no Approval, and to nobody else", async () => {
    const world = await worldWith([
      ["Good one", "good", 0],
      ["Bad one", "bad", 0],
    ]);
    const adminMe = (await world.signUpAdmin(ADMIN)).me;
    await adminMe.subscribeToPush(subscription(1));
    await adminMe.subscribeToPush(subscription(2));
    await (await world.signUp(person(700))).me.subscribeToPush(subscription(3));
    await world.admin.approve(world.ids["Good one"]!);

    expect(await world.app.operator.sendApprovalReminder()).toEqual({ sent: 2 });
    expect(world.webPush.sent.map((push) => push.subscription.endpoint).sort()).toEqual(["https://push.example/1", "https://push.example/2"]);
    expect(world.webPush.sent[0]?.payload).toEqual({ title: "Approve tomorrow's Feelings", body: "The Bad Feeling still needs your Approval before midnight.", link: "/admin/approve" });
  });

  it("is not sent when everything with Candidates is approved, or when there is nothing to approve", async () => {
    const world = await worldWith([["Good one", "good", 0]]);
    await (await world.signUpAdmin(ADMIN)).me.subscribeToPush(subscription(1));
    await world.admin.approve(world.ids["Good one"]!);
    expect(await world.app.operator.sendApprovalReminder()).toEqual({ sent: 0 });

    const empty = await createTestApp({ now: MORNING });
    await (await empty.signUpAdmin(ADMIN)).me.subscribeToPush(subscription(1));
    expect(await empty.app.operator.sendApprovalReminder()).toEqual({ sent: 0 });
  });

  it("names both Polarities when neither is approved, and a failed push stops nothing", async () => {
    const world = await worldWith([
      ["Good one", "good", 0],
      ["Bad one", "bad", 0],
    ]);
    const adminMe = (await world.signUpAdmin(ADMIN)).me;
    await adminMe.subscribeToPush(subscription(1));
    await adminMe.subscribeToPush(subscription(1));
    expect(await world.app.operator.sendApprovalReminder()).toEqual({ sent: 1 });
    expect(world.webPush.sent[0]?.payload.body).toBe("The Good and Bad Feelings still need your Approval before midnight.");

    vi.spyOn(console, "error").mockImplementation(() => {});
    world.webPush.failWith(new Error("push service down"));
    expect(await world.app.operator.sendApprovalReminder()).toEqual({ sent: 0 });
  });

  it("is never needed for the right Feelings to show: with no reminder and no Approval, the Carry-over still happens", async () => {
    const world = await worldWith([["Thursday's", "good", 0]]);
    await world.admin.approve(world.ids["Thursday's"]!);
    world.clock.set("2026-11-14T00:00:00+08:00");
    expect((await world.app.feelingsOfTheDay()).good).toMatchObject({ text: "Thursday's", carriedOver: true });
    expect(world.webPush.sent).toEqual([]);
  });
});
