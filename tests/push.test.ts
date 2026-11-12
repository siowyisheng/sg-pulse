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
