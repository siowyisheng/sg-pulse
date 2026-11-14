import { describe, expect, it } from "vitest";
import { createTestApp } from "@/testing/harness";

const ADMIN = { subject: "s-admin", name: "SIOW YI SHENG", dateOfBirth: "1988-02-03", sex: "M" };

describe("an Admin switches the Design", () => {
  it("shows Classic until one is chosen, then the chosen Design to everyone", async () => {
    const { app, signUpAdmin } = await createTestApp({ now: "2026-11-14T12:00:00+08:00" });
    const { me } = await signUpAdmin(ADMIN);
    expect(await app.design()).toBe("classic");

    await me.asAdmin().setDesign("mrt");

    expect(await app.design()).toBe("mrt");
  });
});
