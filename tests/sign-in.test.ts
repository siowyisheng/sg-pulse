import { describe, expect, it } from "vitest";
import { createTestApp } from "@/testing/harness";

describe("a Visitor logs in with Singpass and becomes a User", () => {
  it("shows their Byline before they agree, signs them in once they do, and straight in the next time", async () => {
    const { app, logIn, clock } = await createTestApp({ now: "2026-11-12T09:00:00+08:00" });
    const person = { subject: "s-tan", name: "TAN AH KOW", dateOfBirth: "1990-05-01", sex: "M" };

    const first = await logIn(person);
    if (first.outcome !== "consent-needed") throw new Error("A first login should ask for consent");
    expect(await app.consentPreview(first.proof)).toEqual({ byline: { initials: "TA", sex: "M", ageBand: "30s" } });

    const session = await app.confirmConsent(first.proof);
    const me = await app.authenticate(session.token);
    expect(me?.byline).toEqual({ initials: "TA", sex: "M", ageBand: "30s" });

    clock.advance({ hours: 24 });
    const again = await logIn(person);
    if (again.outcome !== "signed-in") throw new Error("A returning User should be signed straight in");
    expect((await app.authenticate(again.session.token))?.byline).toEqual({ initials: "TA", sex: "M", ageBand: "30s" });
  });
});
