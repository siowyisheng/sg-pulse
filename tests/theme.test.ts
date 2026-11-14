import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { contrastFailures, designContrastFailures, rawStyleValuesInProject } from "@/theme/checks";
import { colors, designs } from "@/theme/tokens";
import { PolarityBadge } from "@/ui/badges";

describe("the app looks the way the style guide says", () => {
  it("has no raw colour or font value outside the theme tokens", () => {
    expect(rawStyleValuesInProject()).toEqual([]);
  });

  it("keeps every text and background pair the components use readable, in light and dark mode", () => {
    expect(contrastFailures()).toEqual([]);
  });

  it("keeps them readable in every Design too", () => {
    expect(designContrastFailures()).toEqual([]);
  });

  it("shows Polarity with an icon and a label, never by colour alone", () => {
    for (const [polarity, label] of [["good", "Good"], ["bad", "Bad"]] as const) {
      const html = renderToStaticMarkup(createElement(PolarityBadge, { polarity }));
      expect(html).toContain("<svg");
      expect(html.replace(/<[^>]+>/g, "").trim()).toBe(label);
    }
  });

  it("uses exactly the style guide's colours: each one in the guide is a token, and each token is in the guide", () => {
    const guide = readFileSync("docs/style-guide.md", "utf8");
    const inGuide = new Set((guide.match(/#[0-9A-Fa-f]{6}\b/g) ?? []).map((hex) => hex.toUpperCase()));
    const palettes = [colors, ...Object.values(designs)].flatMap((palette) => [palette.light, palette.dark]);
    const inTokens = new Set(palettes.flatMap((palette) => Object.values(palette)).map((hex) => hex.toUpperCase()));
    expect([...inGuide].filter((hex) => !inTokens.has(hex))).toEqual([]);
    expect([...inTokens].filter((hex) => !inGuide.has(hex))).toEqual([]);
  });
});
