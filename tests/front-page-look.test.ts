import { describe, expect, it } from "vitest";
import { createTestApp } from "@/testing/harness";

const ADMIN = { subject: "s-admin", name: "SIOW YI SHENG", dateOfBirth: "1988-02-03", sex: "M" };

describe("an Admin switches the front page look", () => {
  it("shows the original look until one is chosen, then the chosen one to everyone", async () => {
    const { app, signUpAdmin } = await createTestApp({ now: "2026-11-13T12:00:00+08:00" });
    const { me } = await signUpAdmin(ADMIN);
    expect(await app.frontPageLook()).toBe("original");

    await me.asAdmin().setFrontPageLook("sunrise");

    expect(await app.frontPageLook()).toBe("sunrise");
  });
});
