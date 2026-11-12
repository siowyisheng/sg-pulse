import { describe, expect, it } from "vitest";
import { createTestApp } from "@/testing/harness";

const person = (n: number) => ({ subject: `s-${n}`, name: "TAN AH KOW", dateOfBirth: "1990-05-01", sex: "M" });
const ADMIN = { subject: "s-admin", name: "SIOW YI SHENG", dateOfBirth: "1988-02-03", sex: "M" };

/** Wednesday's winner is `Winner`, written by person 1, and it is live on Thursday. */
async function withAPublishedWinner() {
  const world = await createTestApp({ now: "2026-11-12T09:00:00+08:00" });
  const writer = await world.signUp(person(1));
  await writer.me.submitFeeling({ text: "Winner", polarity: "good", hashtag: "kopi" });
  const [candidate] = await world.app.candidates({ polarity: "good", hashtag: "kopi" });
  await (await world.signUp(person(2))).me.upvote(candidate!.id);
  const admin = (await world.signUpAdmin(ADMIN)).me.asAdmin();
  await admin.approve(candidate!.id);
  world.clock.set("2026-11-13T10:00:00+08:00");
  return { ...world, writer, admin, feelingId: candidate!.id };
}

describe("a User asks for a published winner to be removed", () => {
  it("reaches the Admin, who removes it from the front page and the archive and so settles the request", async () => {
    const world = await withAPublishedWinner();
    expect((await world.writer.me.myFeelings())[0]).toMatchObject({ state: "winner", removalRequested: false });

    await world.writer.me.requestRemoval(world.feelingId);

    expect((await world.writer.me.myFeelings())[0]).toMatchObject({ removalRequested: true });
    expect(await world.admin.removalRequests()).toMatchObject([
      { feelingId: world.feelingId, text: "Winner", hashtag: "kopi", requestedAt: new Date("2026-11-13T10:00:00+08:00"), dueBy: new Date("2026-11-14T10:00:00+08:00") },
    ]);

    await world.admin.takeDown(world.feelingId);

    expect(await world.admin.removalRequests()).toEqual([]);
    expect((await world.app.feelingsOfTheDay()).good).toBeNull();
    expect(await world.app.archive()).toEqual([]);
  });
});

describe("a User deletes their account", () => {
  it("removes what we hold about them, ends their sessions, and leaves a published winner standing with its Byline", async () => {
    const world = await withAPublishedWinner();
    world.clock.set("2026-11-13T11:00:00+08:00");
    await world.writer.me.submitFeeling({ text: "Today's try", polarity: "bad", hashtag: "mrt" });
    await world.writer.me.subscribeToPush({ endpoint: "https://push.example/1", p256dh: "k", auth: "a" });

    await world.writer.me.deleteAccount();

    expect(await world.app.authenticate(world.writer.session.token)).toBeUndefined();
    expect(await world.app.candidates({ polarity: "bad", hashtag: "mrt" })).toEqual([]);
    expect((await world.app.feelingsOfTheDay()).good).toMatchObject({ text: "Winner", byline: { initials: "TA", sex: "M", ageBand: "30s" }, yahLahs: 1, fromTheTeam: false });
    // Signing in again with Singpass starts from nothing.
    const again = await world.signUp(person(1));
    expect(await again.me.myFeelings()).toEqual([]);
  });
});
