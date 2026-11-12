import { describe, expect, it } from "vitest";
import { createTestApp } from "@/testing/harness";

const person = (n: number) => ({ subject: `s-${n}`, name: "TAN AH KOW", dateOfBirth: "1990-05-01", sex: "M" });
const subscription = (n: number) => ({ endpoint: `https://push.example/${n}`, p256dh: "key", auth: "auth" });

async function worldWithSeeds(cycle = "2026-11-13", polarities: ("good" | "bad")[] = ["good", "bad"]) {
  const world = await createTestApp({ now: "2026-11-12T09:00:00+08:00" });
  for (const polarity of polarities) {
    await world.app.operator.scheduleSeedFeeling({ cycle, polarity, text: `A ${polarity} day`, hashtag: polarity === "good" ? "kopi" : "queue" });
  }
  return world;
}

describe("the daily push", () => {
  it("goes out again the next day, with that day's Hashtags", async () => {
    const world = await worldWithSeeds();
    await world.app.operator.scheduleSeedFeeling({ cycle: "2026-11-14", polarity: "good", text: "Saturday", hashtag: "weekend" });
    await (await world.signUp(person(1))).me.subscribeToPush(subscription(1));
    world.clock.set("2026-11-13T07:00:00+08:00");
    await world.app.operator.sendDailyPush();
    world.clock.set("2026-11-14T07:00:00+08:00");
    expect(await world.app.operator.sendDailyPush()).toEqual({ sent: 1 });
    expect(world.webPush.sent[1]?.payload.body).toBe("SG's FOTD are about #weekend and #queue");
  });

  it("names the one Hashtag there is when a Polarity has no Feeling of the Day, and says nothing when neither has", async () => {
    const world = await worldWithSeeds("2026-11-13", ["good"]);
    await (await world.signUp(person(1))).me.subscribeToPush(subscription(1));
    world.clock.set("2026-11-12T07:00:00+08:00");
    expect(await world.app.operator.sendDailyPush()).toEqual({ sent: 0 });
    world.clock.set("2026-11-13T07:00:00+08:00");
    await world.app.operator.sendDailyPush();
    expect(world.webPush.sent[0]?.payload.body).toBe("SG's FOTD are about #kopi");
  });

  it("forgets a browser the push service reports as gone, and still reaches the others", async () => {
    const world = await worldWithSeeds();
    await (await world.signUp(person(1))).me.subscribeToPush(subscription(1));
    await (await world.signUp(person(2))).me.subscribeToPush(subscription(2));
    world.webPush.expire("https://push.example/1");
    world.clock.set("2026-11-13T07:00:00+08:00");
    expect(await world.app.operator.sendDailyPush()).toEqual({ sent: 1 });
    expect(world.webPush.sent.map((push) => push.subscription.endpoint)).toEqual(["https://push.example/2"]);
    world.clock.set("2026-11-14T07:00:00+08:00");
    await world.app.operator.sendDailyPush();
    // Nothing is retried for the gone one: it isn't stored any more.
    expect(world.webPush.sent.map((push) => push.subscription.endpoint)).toEqual(["https://push.example/2", "https://push.example/2"]);
  });

  it("tries a browser again on the next run when the push service was merely down", async () => {
    const world = await worldWithSeeds();
    await (await world.signUp(person(1))).me.subscribeToPush(subscription(1));
    world.clock.set("2026-11-13T07:00:00+08:00");
    world.webPush.failWith(new Error("push service down"));
    expect(await world.app.operator.sendDailyPush()).toEqual({ sent: 0 });
    world.webPush.failWith(undefined);
    expect(await world.app.operator.sendDailyPush()).toEqual({ sent: 1 });
    expect(await world.app.operator.sendDailyPush()).toEqual({ sent: 0 });
  });

  it("is not sent to someone who never allowed it, and a browser saved twice gets one push", async () => {
    const world = await worldWithSeeds();
    await world.signUp(person(1));
    const second = await world.signUp(person(2));
    await second.me.subscribeToPush(subscription(2));
    await second.me.subscribeToPush(subscription(2));
    world.clock.set("2026-11-13T07:00:00+08:00");
    expect(await world.app.operator.sendDailyPush()).toEqual({ sent: 1 });
  });
});

describe("connecting web push", () => {
  it("is switched off with no keys, and refuses to start with only one of them", async () => {
    const { getWebPush } = await import("@/composition");
    await expect(getWebPush({}).send({ endpoint: "https://push.example/1", p256dh: "k", auth: "a" }, { title: "t", body: "b" })).rejects.toThrow("not configured");
    expect(() => getWebPush({ NEXT_PUBLIC_VAPID_PUBLIC_KEY: "public" })).toThrow("VAPID_PRIVATE_KEY");
    expect(() => getWebPush({ VAPID_PRIVATE_KEY: "private" })).toThrow("NEXT_PUBLIC_VAPID_PUBLIC_KEY");
  });
});
