import { describe, expect, it } from "vitest";
import { codeFor, createFakeSingpass } from "@/adapters/fake-singpass";
import { FakeClock, FakeWebPush } from "@/testing/fakes";

describe("fakes behave like the real thing where tests depend on it", () => {
  it("the clock only moves when told to", () => {
    const clock = new FakeClock("2026-11-10T00:00:00Z");
    clock.advance({ hours: 25 });
    expect(clock.now().toISOString()).toBe("2026-11-11T01:00:00.000Z");
    clock.set("2026-12-04T19:30:00+08:00");
    expect(clock.now().toISOString()).toBe("2026-12-04T11:30:00.000Z");
  });

  it("the fake Singpass sends the browser to its login page and hands back the chosen person", async () => {
    const singpass = createFakeSingpass();
    const { url } = await singpass.authorize({ state: "s 1", nonce: "n", codeVerifier: "v" });
    expect(url).toBe("/demo/singpass?state=s%201");
    const person = { subject: "11111111-1111-4111-8111-111111111111", name: "TAN AH KOW", dateOfBirth: "1990-05-01", sex: "M" };
    expect(await singpass.exchange({ code: codeFor(person), nonce: "n", codeVerifier: "v" })).toEqual(person);
    await expect(singpass.exchange({ code: "nonsense", nonce: "n", codeVerifier: "v" })).rejects.toThrow(/not a person/);
  });

  it("the fake web push records what was sent, and can be down", async () => {
    const webPush = new FakeWebPush();
    const subscription = { endpoint: "https://push.example/1", p256dh: "k", auth: "a" };
    await webPush.send(subscription, { title: "Yah Lah", body: "hello" });
    expect(webPush.sent).toEqual([{ subscription, payload: { title: "Yah Lah", body: "hello" } }]);
    webPush.failWith(new Error("down"));
    await expect(webPush.send(subscription, { title: "Yah Lah", body: "again" })).rejects.toThrow("down");
  });
});
