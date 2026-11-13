import { describe, expect, it } from "vitest";
import { createTestApp } from "@/testing/harness";

const person = (n: number) => ({ subject: `s-${n}`, name: "TAN AH KOW", dateOfBirth: "1990-05-01", sex: "M" });

describe("feedback", () => {
  it("emails the owner a problem, with where it came from, who sent it as a Byline, and how to reply", async () => {
    const world = await createTestApp({ now: "2026-11-13T10:00:00+08:00" });
    const { me } = await world.signUp(person(1));

    await me.sendFeedback({ kind: "problem", message: "The Upvote button does nothing.", replyTo: "ah.kow@example.com", page: "/feelings/good/mrt", browser: "Safari on iPhone" });

    expect(world.mailer.sent).toEqual([
      {
        to: "owner@example.com",
        subject: "Yah Lah problem: The Upvote button does nothing.",
        replyTo: "ah.kow@example.com",
        text: "The Upvote button does nothing.\n\n---\nPage: /feelings/good/mrt\nBrowser: Safari on iPhone\nFrom: TA · M · 30s\nReply to: ah.kow@example.com",
      },
    ]);
  });
});
