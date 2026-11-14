import { describe, expect, it } from "vitest";
import { createTestApp } from "@/testing/harness";

const ADMIN = { subject: "s-admin", name: "SIOW YI SHENG", dateOfBirth: "1988-02-03", sex: "M" };

describe("an Admin renames the site", () => {
  it("is Yah Lah until renamed, then the new name for everyone", async () => {
    const { app, signUpAdmin } = await createTestApp({ now: "2026-11-14T12:00:00+08:00" });
    const { me } = await signUpAdmin(ADMIN);
    expect(await app.appName()).toBe("yah-lah");

    await me.asAdmin().setAppName("sg-pulse");

    expect(await app.appName()).toBe("sg-pulse");
  });
});
