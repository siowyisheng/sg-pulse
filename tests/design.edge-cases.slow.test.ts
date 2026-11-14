import { describe, expect, it } from "vitest";
import { createTestApp } from "@/testing/harness";

const ADMIN = { subject: "s-admin", name: "SIOW YI SHENG", dateOfBirth: "1988-02-03", sex: "M" };

describe("the Design, at the edges", () => {
  it("refuses a Design that doesn't exist and keeps the one showing", async () => {
    const { app, signUpAdmin } = await createTestApp({ now: "2026-11-14T12:00:00+08:00" });
    const { me } = await signUpAdmin(ADMIN);
    await me.asAdmin().setDesign("kopitiam");

    await expect(me.asAdmin().setDesign("vaporwave")).rejects.toMatchObject({ code: "NO_SUCH_DESIGN" });

    expect(await app.design()).toBe("kopitiam");
  });

  it("is kept apart from the Front page look: switching one leaves the other as it was", async () => {
    const { app, signUpAdmin } = await createTestApp({ now: "2026-11-14T12:00:00+08:00" });
    const { me } = await signUpAdmin(ADMIN);
    await me.asAdmin().setFrontPageLook("postcards");
    await me.asAdmin().setDesign("hawker");
    await me.asAdmin().setDesign("classic");
    expect(await app.frontPageLook()).toBe("postcards");
    expect(await app.design()).toBe("classic");
  });

  it("records each switch in the audit log against the Admin", async () => {
    const { signUpAdmin } = await createTestApp({ now: "2026-11-14T12:00:00+08:00" });
    const { me } = await signUpAdmin(ADMIN);
    await me.asAdmin().setDesign("garden-city");
    const entries = await me.asAdmin().auditLog();
    expect(entries.find((entry) => entry.action === "design")).toMatchObject({ actorId: me.userId, detail: "garden-city" });
  });
});
