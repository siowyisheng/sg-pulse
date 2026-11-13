import { describe, expect, it } from "vitest";
import { createResendMailer } from "@/adapters/resend";
import { feedbackSettings } from "@/composition";
import { createTestApp } from "@/testing/harness";

const person = (n: number) => ({ subject: `s-${n}`, name: "TAN AH KOW", dateOfBirth: "1990-05-01", sex: "M" });

async function signedIn() {
  const world = await createTestApp({ now: "2026-11-13T10:00:00+08:00" });
  const { me } = await world.signUp(person(1));
  return { ...world, me };
}

describe("refusing feedback", () => {
  it("needs a choice, a message and a plausible reply address, and sends nothing otherwise", async () => {
    const w = await signedIn();
    await expect(w.me.sendFeedback({ kind: "other" as never, message: "Hi" })).rejects.toMatchObject({ code: "NO_KIND" });
    await expect(w.me.sendFeedback({ kind: "problem", message: "   \n " })).rejects.toMatchObject({ code: "EMPTY" });
    await expect(w.me.sendFeedback({ kind: "problem", message: "x".repeat(1001) })).rejects.toMatchObject({ code: "TOO_LONG" });
    await expect(w.me.sendFeedback({ kind: "problem", message: "Hi", replyTo: "not an email" })).rejects.toMatchObject({ code: "BAD_REPLY_TO" });
    expect(w.mailer.sent).toEqual([]);
  });

  it("takes exactly 1,000 characters, counting a Chinese character or an emoji as one", async () => {
    const w = await signedIn();
    await w.me.sendFeedback({ kind: "suggestion", message: "好".repeat(500) + "😀".repeat(500) });
    expect(w.mailer.sent).toHaveLength(1);
  });

  it("is switched off when there is nowhere to send it", async () => {
    const world = await createTestApp({ feedbackTo: null });
    const { me } = await world.signUp(person(1));
    await expect(me.sendFeedback({ kind: "problem", message: "Hi" })).rejects.toMatchObject({ code: "NOT_OPEN" });
  });
});

describe("the daily limit", () => {
  it("lets a User send 5 a Singapore day, then asks them to try tomorrow, and resets at midnight", async () => {
    const w = await signedIn();
    for (let n = 0; n < 5; n++) await w.me.sendFeedback({ kind: "suggestion", message: `Idea ${n}` });
    await expect(w.me.sendFeedback({ kind: "suggestion", message: "One more" })).rejects.toMatchObject({ code: "LIMIT", message: expect.stringContaining("tomorrow") });
    expect(w.mailer.sent).toHaveLength(5);
    w.clock.set("2026-11-13T23:59:00+08:00");
    await expect(w.me.sendFeedback({ kind: "suggestion", message: "Still today" })).rejects.toMatchObject({ code: "LIMIT" });
    w.clock.set("2026-11-14T00:01:00+08:00");
    await w.me.sendFeedback({ kind: "suggestion", message: "A new day" });
    expect(w.mailer.sent).toHaveLength(6);
  });

  it("is counted for each User on their own", async () => {
    const w = await signedIn();
    for (let n = 0; n < 5; n++) await w.me.sendFeedback({ kind: "problem", message: `Problem ${n}` });
    const other = await w.signUp(person(2));
    await other.me.sendFeedback({ kind: "problem", message: "Mine" });
    expect(w.mailer.sent).toHaveLength(6);
  });
});

describe("a bot", () => {
  it("that fills the hidden field is told it worked, and nothing is sent or counted", async () => {
    const w = await signedIn();
    await expect(w.me.sendFeedback({ kind: "problem", message: "Buy pills", website: "http://spam.example" })).resolves.toBeUndefined();
    expect(w.mailer.sent).toEqual([]);
    expect((await w.app.operator.listUsers()).length).toBe(1);
  });
});

describe("when the mail provider fails", () => {
  it("says it didn't send, doesn't count against the limit, and works on trying again", async () => {
    const w = await signedIn();
    w.mailer.failWith(new Error("Resend is down"));
    for (let n = 0; n < 6; n++) await expect(w.me.sendFeedback({ kind: "problem", message: "Please" })).rejects.toMatchObject({ code: "NOT_SENT" });
    w.mailer.failWith(undefined);
    await w.me.sendFeedback({ kind: "problem", message: "Please" });
    expect(w.mailer.sent).toHaveLength(1);
  });
});

describe("what is kept and what is sent", () => {
  it("keeps no text, no reply address and no name: only that a User sent one", async () => {
    const w = await signedIn();
    await w.me.sendFeedback({ kind: "problem", message: "Secret complaint about the MRT", replyTo: "ah.kow@example.com" });
    const stored = JSON.stringify(await w.everythingStored());
    expect(stored).not.toContain("Secret complaint");
    expect(stored).not.toContain("ah.kow@example.com");
    expect(stored).not.toContain("TAN AH KOW");
    expect((await (await w.signUpAdmin({ subject: "s-admin", name: "SIOW YI SHENG", dateOfBirth: "1988-02-03", sex: "M" })).me.asAdmin().auditLog()).filter((e) => e.action === "feedback")).toMatchObject([{ detail: "problem", feelingId: null }]);
  });

  it("sends no name, Singpass ID or user ID", async () => {
    const w = await signedIn();
    await w.me.sendFeedback({ kind: "problem", message: "Hi" });
    const text = JSON.stringify(w.mailer.sent);
    expect(text).not.toContain("TAN AH KOW");
    expect(text).not.toContain("s-1");
    expect(text).not.toContain(w.me.userId);
  });

  it("sends line breaks and Chinese or Tamil text as they were written, and a long subject cut short on one line", async () => {
    const w = await signedIn();
    const message = "第一行\nஇரண்டாவது வரி\n\n<b>not bold</b>";
    await w.me.sendFeedback({ kind: "suggestion", message });
    expect(w.mailer.sent[0]!.text.startsWith(message)).toBe(true);
    expect(w.mailer.sent[0]!.subject).not.toContain("\n");
    await w.me.sendFeedback({ kind: "suggestion", message: "word ".repeat(100) });
    expect(w.mailer.sent[1]!.subject.length).toBeLessThan(90);
    expect(w.mailer.sent[1]!.subject.endsWith("…")).toBe(true);
  });

  it("can't be turned into extra email headers by a newline in the page or browser", async () => {
    const w = await signedIn();
    await w.me.sendFeedback({ kind: "problem", message: "Hi", page: "/me\nBcc: someone@example.com", browser: "x\r\nTo: y@example.com" });
    expect(w.mailer.sent[0]!.text).toContain("Page: /me Bcc: someone@example.com");
  });
});

describe("the real mailer and its settings", () => {
  it("is on only when the owner's address, a Resend key and a sender are all set", () => {
    expect(feedbackSettings({})).toBeNull();
    expect(feedbackSettings({ FEEDBACK_TO: "a@b.co", RESEND_API_KEY: "k" })).toBeNull();
    expect(feedbackSettings({ FEEDBACK_TO: "a@b.co", RESEND_API_KEY: "k", FEEDBACK_FROM: "Yah Lah <no-reply@b.co>" })).toEqual({ to: "a@b.co", apiKey: "k", from: "Yah Lah <no-reply@b.co>" });
  });

  it("posts plain text to Resend with the key and Reply-To, and treats a refusal as a failure", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const mailer = createResendMailer({ apiKey: "key", from: "Yah Lah <no-reply@b.co>" }, (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(calls.length === 1 ? "{}" : "bad key", { status: calls.length === 1 ? 200 : 401 });
    }) as typeof fetch);
    await mailer.send({ to: "a@b.co", subject: "S", text: "T", replyTo: "r@b.co" });
    expect(calls[0]!.url).toBe("https://api.resend.com/emails");
    expect((calls[0]!.init.headers as Record<string, string>).authorization).toBe("Bearer key");
    expect(JSON.parse(String(calls[0]!.init.body))).toEqual({ from: "Yah Lah <no-reply@b.co>", to: ["a@b.co"], subject: "S", text: "T", reply_to: "r@b.co" });
    await expect(mailer.send({ to: "a@b.co", subject: "S", text: "T" })).rejects.toThrow("401");
  });
});
