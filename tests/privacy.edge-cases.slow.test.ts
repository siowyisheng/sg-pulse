import { describe, expect, it } from "vitest";
import { createTestApp } from "@/testing/harness";

const person = (n: number) => ({ subject: `s-${n}`, name: "TAN AH KOW", dateOfBirth: "1990-05-01", sex: "M" });
const ADMIN = { subject: "s-admin", name: "SIOW YI SHENG", dateOfBirth: "1988-02-03", sex: "M" };

/** Thursday morning: person 1's `Winner` is live today; person 3's `Tomorrow's` is approved for Friday; person 4 has `Other` as a Candidate. */
async function world() {
  const w = await createTestApp({ now: "2026-11-12T09:00:00+08:00" });
  const writer = await w.signUp(person(1));
  await writer.me.submitFeeling({ text: "Winner", polarity: "good", hashtag: "kopi" });
  const [winner] = await w.app.candidates({ polarity: "good", hashtag: "kopi" });
  await (await w.signUp(person(2))).me.upvote(winner!.id);
  const admin = (await w.signUpAdmin(ADMIN)).me.asAdmin();
  await admin.approve(winner!.id);
  w.clock.set("2026-11-13T10:00:00+08:00");
  const stranger = await w.signUp(person(3));
  await stranger.me.submitFeeling({ text: "Tomorrow's", polarity: "good", hashtag: "kopi" });
  const [tomorrows] = (await w.app.candidates({ polarity: "good", hashtag: "kopi" })).filter((c) => c.text === "Tomorrow's");
  await admin.approve(tomorrows!.id);
  return { ...w, writer, stranger, admin, winnerId: winner!.id, tomorrowsId: tomorrows!.id };
}

describe("asking for removal", () => {
  it("is for your own published winner only: not someone else's, not a Candidate, not one that hasn't gone live", async () => {
    const w = await world();
    await expect(w.stranger.me.requestRemoval(w.winnerId)).rejects.toMatchObject({ code: "NOT_YOUR_WINNER" });
    await expect(w.stranger.me.requestRemoval(w.tomorrowsId)).rejects.toMatchObject({ code: "NOT_YOUR_WINNER" });
    await expect(w.writer.me.requestRemoval("nonsense")).rejects.toMatchObject({ code: "NOT_YOUR_WINNER" });
    await expect(w.writer.me.requestRemoval("11111111-1111-4111-8111-111111111111")).rejects.toMatchObject({ code: "NOT_YOUR_WINNER" });
    expect(await w.admin.removalRequests()).toEqual([]);
  });

  it("is quietly the same when made twice: one request, one entry in the log", async () => {
    const w = await world();
    await w.writer.me.requestRemoval(w.winnerId);
    await w.writer.me.requestRemoval(w.winnerId);
    expect(await w.admin.removalRequests()).toHaveLength(1);
    expect((await w.admin.auditLog()).filter((entry) => entry.action === "removal-requested")).toHaveLength(1);
  });

  it("can be honoured for an older day that is only in the archive, and the Feeling then leaves it", async () => {
    const w = await world();
    await w.writer.me.requestRemoval(w.winnerId);
    w.clock.set("2026-11-16T10:00:00+08:00");
    expect((await w.app.archive()).map((feeling) => feeling.text)).toContain("Winner");
    await w.admin.takeDown(w.winnerId);
    expect((await w.app.archive()).map((feeling) => feeling.text)).not.toContain("Winner");
    expect(await w.admin.removalRequests()).toEqual([]);
    expect((await w.writer.me.myFeelings()).find((feeling) => feeling.id === w.winnerId)).toMatchObject({ state: "removed", removalRequested: false });
  });

  it("is due a day after it was made, and the oldest waits at the top", async () => {
    const w = await world();
    const second = await w.signUp(person(5));
    await w.writer.me.requestRemoval(w.winnerId);
    expect((await w.admin.removalRequests())[0]).toMatchObject({ requestedAt: new Date("2026-11-13T10:00:00+08:00"), dueBy: new Date("2026-11-14T10:00:00+08:00"), byline: { initials: "TA" } });
    expect(second).toBeDefined();
  });
});

describe("deleting an account", () => {
  it("takes the Candidate and an Approval for tomorrow with it, leaving the Carry-over standing", async () => {
    const w = await world();
    await w.stranger.me.deleteAccount();
    expect((await w.admin.approvalChoices()).good.choices).toEqual([]);
    expect((await w.app.candidates({ polarity: "good", hashtag: "kopi" })).map((c) => c.text)).toEqual([]);
    w.clock.set("2026-11-14T00:01:00+08:00");
    expect((await w.app.feelingsOfTheDay()).good).toMatchObject({ text: "Winner", carriedOver: true });
  });

  it("stands for what they Reported and Upvoted, and the record keeps their actions without the account", async () => {
    const w = await world();
    const reporter = await w.signUp(person(6));
    await reporter.me.report(w.tomorrowsId);
    await reporter.me.deleteAccount();
    expect(await w.admin.reports()).toMatchObject([{ feelingId: w.tomorrowsId }]);
    const log = await w.admin.auditLog();
    expect(log.map((entry) => entry.action)).toEqual(expect.arrayContaining(["report", "account-deleted"]));
    expect(await w.app.authenticate(reporter.session.token)).toBeUndefined();
  });

  it("can ask in the same breath for its published winners to be removed, since there is nobody to ask afterwards", async () => {
    const w = await world();
    await w.writer.me.deleteAccount({ alsoRemoveWinners: true });
    expect(await w.admin.removalRequests()).toMatchObject([{ feelingId: w.winnerId, text: "Winner", byline: { initials: "TA", sex: "M", ageBand: "30s" } }]);
    await w.admin.takeDown(w.winnerId);
    expect(await w.admin.removalRequests()).toEqual([]);
    expect((await w.app.feelingsOfTheDay()).good).toBeNull();
  });

  it("takes with it a Feeling an Admin has already removed, since nothing is left to keep", async () => {
    const w = await world();
    await w.admin.takeDown(w.winnerId);
    await w.writer.me.deleteAccount();
    expect(await w.everythingStored()).not.toContain("Winner");
  });

  it("does nothing the second time", async () => {
    const w = await world();
    await w.writer.me.deleteAccount();
    await expect(w.writer.me.deleteAccount()).resolves.toBeUndefined();
    expect((await w.admin.auditLog()).filter((entry) => entry.action === "account-deleted")).toHaveLength(1);
  });

  it("is all or nothing: a refused write leaves the account and its Feelings whole, and trying again works", async () => {
    const w = await world();
    const letThrough = await w.refuseWritesTo("audit_log");
    await expect(w.stranger.me.deleteAccount()).rejects.toThrow();
    expect(await w.app.authenticate(w.stranger.session.token)).toBeDefined();
    expect((await w.stranger.me.myFeelings()).map((feeling) => feeling.text)).toEqual(["Tomorrow's"]);
    await letThrough();
    await w.stranger.me.deleteAccount();
    expect(await w.app.authenticate(w.stranger.session.token)).toBeUndefined();
  });

  it("leaves nothing of the person in what is stored but the Byline of a published winner", async () => {
    const w = await world();
    await w.stranger.me.subscribeToPush({ endpoint: "https://push.example/3", p256dh: "k", auth: "a" });
    await w.stranger.me.deleteAccount();
    const stored = JSON.stringify(await w.everythingStored());
    expect(stored).not.toContain("s-3");
    expect(stored).not.toContain("push.example/3");
    expect(stored).not.toContain("Tomorrow's");
  });
});

describe("the log of submissions, Reports and Admin actions", () => {
  it("has a line for each submission, and never a name", async () => {
    const w = await world();
    const log = await w.admin.auditLog();
    expect(log.filter((entry) => entry.action === "submit")).toHaveLength(2);
    expect(JSON.stringify(log)).not.toMatch(/TAN AH KOW|SIOW|S\d{7}[A-Z]/);
  });

  it("is kept for twelve months and then removed", async () => {
    const w = await world();
    w.clock.set("2027-11-12T08:00:00+08:00");
    expect(await w.app.operator.purgeOldLogs()).toEqual({ removed: 0 });
    w.clock.set("2027-11-13T10:00:01+08:00");
    const { removed } = await w.app.operator.purgeOldLogs();
    expect(removed).toBeGreaterThan(0);
    expect((await w.admin.auditLog()).filter((entry) => entry.at < new Date("2026-11-13T10:00:00+08:00"))).toEqual([]);
  });

  it("removes only what is old enough", async () => {
    const w = await world();
    w.clock.set("2027-11-13T10:00:01+08:00");
    const lateComer = await w.signUp(person(7));
    await lateComer.me.submitFeeling({ text: "A year on", polarity: "bad", hashtag: "later" });
    await w.app.operator.purgeOldLogs();
    expect((await w.admin.auditLog()).map((entry) => entry.action)).toEqual(["submit"]);
  });
});
