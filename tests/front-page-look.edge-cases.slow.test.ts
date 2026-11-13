import { describe, expect, it } from "vitest";
import { createTestApp } from "@/testing/harness";

const ADMIN = { subject: "s-admin", name: "SIOW YI SHENG", dateOfBirth: "1988-02-03", sex: "M" };

describe("the front page look, at the edges", () => {
  it("refuses a look that doesn't exist and keeps the one showing", async () => {
    const { app, signUpAdmin } = await createTestApp({ now: "2026-11-13T12:00:00+08:00" });
    const { me } = await signUpAdmin(ADMIN);
    await me.asAdmin().setFrontPageLook("postcards");

    await expect(me.asAdmin().setFrontPageLook("comic-sans")).rejects.toMatchObject({ code: "NO_SUCH_LOOK" });

    expect(await app.frontPageLook()).toBe("postcards");
  });

  it("can be switched back and forth, and the latest choice wins", async () => {
    const { app, signUpAdmin } = await createTestApp({ now: "2026-11-13T12:00:00+08:00" });
    const { me } = await signUpAdmin(ADMIN);
    for (const look of ["highlighter", "postcards", "original"] as const) await me.asAdmin().setFrontPageLook(look);
    expect(await app.frontPageLook()).toBe("original");
  });

  it("records each switch in the audit log against the Admin", async () => {
    const { signUpAdmin } = await createTestApp({ now: "2026-11-13T12:00:00+08:00" });
    const { me } = await signUpAdmin(ADMIN);
    await me.asAdmin().setFrontPageLook("highlighter");
    const entries = await me.asAdmin().auditLog();
    expect(entries.find((entry) => entry.action === "front-page-look")).toMatchObject({ actorId: me.userId, detail: "highlighter" });
  });
});
