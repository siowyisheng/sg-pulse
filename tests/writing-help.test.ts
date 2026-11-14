import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FeelingFields } from "@/ui/feeling-fields";

describe("help while writing a Feeling", () => {
  it("offers today's Hashtags in use as buttons to tap, most used first", () => {
    const html = renderToStaticMarkup(createElement(FeelingFields, { hashtagsInUse: ["mrt", "kopi", "weather"] }));
    const chips = [...html.matchAll(/<button[^>]*class="[^"]*hashtag-chip[^"]*"[^>]*>(.*?)<\/button>/g)].map((match) => match[1]!.replace(/<[^>]+>/g, ""));
    expect(chips).toEqual(["#mrt", "#kopi", "#weather"]);
  });
});

describe("the prompt in the empty Feeling box", () => {
  it("fits the Polarity chosen, is the same for everyone on a day, and changes from day to day", async () => {
    const { writingPrompt } = await import("@/web/writing-prompts");
    const friday = { neutral: writingPrompt(null, "2026-11-13"), good: writingPrompt("good", "2026-11-13"), bad: writingPrompt("bad", "2026-11-13") };

    expect(new Set(Object.values(friday)).size).toBe(3);
    expect(writingPrompt("good", "2026-11-13")).toBe(friday.good);
    const week = ["2026-11-14", "2026-11-15", "2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19"].map((day) => writingPrompt("good", day));
    expect(week.some((prompt) => prompt !== friday.good)).toBe(true);
  });
});
