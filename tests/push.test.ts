import { describe, expect, it } from "vitest";
import { createTestApp } from "@/testing/harness";

const person = (n: number) => ({ subject: `s-${n}`, name: "TAN AH KOW", dateOfBirth: "1990-05-01", sex: "M" });
const subscription = (n: number) => ({ endpoint: `https://push.example/${n}`, p256dh: "key", auth: "auth" });

describe("the daily push", () => {
  it("tells each subscribed browser the two Hashtags once a day, and not again if the job runs twice", async () => {
    const world = await createTestApp({ now: "2026-11-12T09:00:00+08:00" });
    for (const polarity of ["good", "bad"] as const) {
      await world.app.operator.scheduleSeedFeeling({ cycle: "2026-11-13", polarity, text: `A ${polarity} day`, hashtag: polarity === "good" ? "kopi" : "queue" });
    }
    await (await world.signUp(person(1))).me.subscribeToPush(subscription(1));
    await (await world.signUp(person(2))).me.subscribeToPush(subscription(2));

    world.clock.set("2026-11-13T07:00:00+08:00");
    expect(await world.app.operator.sendDailyPush()).toEqual({ sent: 2 });
    expect(world.webPush.sent.map((push) => push.payload)).toEqual([
      { title: "Yah Lah", body: "SG's FOTD are about #kopi and #queue", link: "/" },
      { title: "Yah Lah", body: "SG's FOTD are about #kopi and #queue", link: "/" },
    ]);

    expect(await world.app.operator.sendDailyPush()).toEqual({ sent: 0 });
    expect(world.webPush.sent).toHaveLength(2);
  });
});

describe("how a User's Yah Lah did", () => {
  it("tells them the next morning, in their push and on My Feelings, how many others chose the same Feeling", async () => {
    const world = await createTestApp({ now: "2026-11-12T09:00:00+08:00" });
    for (const polarity of ["good", "bad"] as const) {
      await world.app.operator.scheduleSeedFeeling({ cycle: "2026-11-13", polarity, text: `A ${polarity} day`, hashtag: polarity === "good" ? "kopi" : "queue" });
    }
    const seat = await (await world.signUp(person(1))).me.submitFeeling({ text: "Got a seat", polarity: "good", hashtag: "mrt" });
    const upvoter = await world.signUp(person(2));
    await upvoter.me.subscribeToPush(subscription(2));
    for (const n of [2, 3, 4]) await (await world.signUp(person(n))).me.upvote(seat.id);

    world.clock.set("2026-11-13T07:00:00+08:00");
    await world.app.operator.sendDailyPush();

    expect(world.webPush.sent.map((push) => push.payload.body)).toEqual(["SG's FOTD are about #kopi and #queue. 2 others chose the same Feeling as you yesterday."]);
    expect(await upvoter.me.yesterdaysYahLah()).toEqual({ text: "Got a seat", polarity: "good", hashtag: "mrt", others: 2, line: "2 others chose the same Feeling as you yesterday" });
  });
});
