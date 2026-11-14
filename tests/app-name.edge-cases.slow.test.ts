import { describe, expect, it } from "vitest";
import { createTestApp } from "@/testing/harness";

const ADMIN = { subject: "s-admin", name: "SIOW YI SHENG", dateOfBirth: "1988-02-03", sex: "M" };

describe("the App name, at the edges", () => {
  it("refuses a name that isn't one of the choices and keeps the one showing", async () => {
    const { app, signUpAdmin } = await createTestApp({ now: "2026-11-14T12:00:00+08:00" });
    const { me } = await signUpAdmin(ADMIN);
    await me.asAdmin().setAppName("how-is-singapore");

    await expect(me.asAdmin().setAppName("Anything I Like")).rejects.toMatchObject({ code: "NO_SUCH_APP_NAME" });

    expect(await app.appName()).toBe("how-is-singapore");
  });

  it("leaves the Design and the Front page look as they were", async () => {
    const { app, signUpAdmin } = await createTestApp({ now: "2026-11-14T12:00:00+08:00" });
    const { me } = await signUpAdmin(ADMIN);
    await me.asAdmin().setDesign("mrt");
    await me.asAdmin().setAppName("shiok-or-not");
    expect(await app.design()).toBe("mrt");
    expect(await app.frontPageLook()).toBe("original");
  });

  it("records each rename in the audit log against the Admin", async () => {
    const { signUpAdmin } = await createTestApp({ now: "2026-11-14T12:00:00+08:00" });
    const { me } = await signUpAdmin(ADMIN);
    await me.asAdmin().setAppName("sg-feels");
    const entries = await me.asAdmin().auditLog();
    expect(entries.find((entry) => entry.action === "app-name")).toMatchObject({ actorId: me.userId, detail: "sg-feels" });
  });
});
