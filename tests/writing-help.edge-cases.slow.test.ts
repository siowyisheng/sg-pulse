import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FeelingFields } from "@/ui/feeling-fields";
import { writingPrompt } from "@/web/writing-prompts";

describe("help while writing a Feeling, at the edges", () => {
  it("shows the neutral prompt in the box before Good or Bad is chosen, and only as a placeholder beside the label", () => {
    const html = renderToStaticMarkup(createElement(FeelingFields, { promptDay: "2026-11-13" }));
    expect(html).toContain(`placeholder="${writingPrompt(null, "2026-11-13").replaceAll("'", "&#x27;")}"`);
    expect(html).toContain("Your Feeling");
    expect(html).not.toMatch(/<textarea[^>]*>[^<]+<\/textarea>/);
  });

  it("shows no chips when no Hashtag is in use yet, and no prompt without a day", () => {
    const html = renderToStaticMarkup(createElement(FeelingFields, {}));
    expect(html).not.toContain("hashtag-chip");
    expect(html).not.toContain("placeholder=\"What");
  });
});
