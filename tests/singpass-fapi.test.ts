import { describe, expect, it, vi } from "vitest";
import { createSingpassFapi } from "@/adapters/singpass-fapi";
import { createTestApp } from "@/testing/harness";
import { CLIENT_ID, createFakeSingpassServer, ISSUER, myinfo, REDIRECT_URI } from "./fake-singpass-server";

vi.setConfig({ testTimeout: 30_000 });

const SUBJECT = "d45d8f21-6178-4713-b962-8635ed2a945a";

describe("the real Singpass adapter (FAPI 2.0)", () => {
  it("logs someone in through PAR, DPoP, the token request and userinfo, asking only for name, date of birth and sex", async () => {
    const server = await createFakeSingpassServer();
    const singpass = createSingpassFapi({
      issuer: ISSUER,
      clientId: CLIENT_ID,
      redirectUri: REDIRECT_URI,
      privateKeys: server.privateKeys,
      fetch: server.fetch,
      singpassKeys: server.singpassKeys,
    });
    const { app } = await createTestApp({ now: "2026-11-12T09:00:00+08:00", singpass });

    const { url, state } = await app.startSingpass();
    expect(url.startsWith(`${ISSUER}/auth?`)).toBe(true);
    const callback = server.consent(url, { subject: SUBJECT, personInfo: myinfo() });
    expect(callback.state).toBe(state);
    const login = await app.finishSingpass({ ...callback, browserState: state });

    expect(server.seen.scopes).toEqual(["openid name dob sex"]);
    if (login.outcome !== "consent-needed") throw new Error("A first login should ask for consent");
    expect(await app.consentPreview(login.proof)).toEqual({ byline: { initials: "TM", sex: "F", ageBand: "30s" } });
  });
});
