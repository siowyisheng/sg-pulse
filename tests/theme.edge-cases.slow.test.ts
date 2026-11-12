import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contrastFailures, contrastRatio, pairsSetInCss, rawStyleValues } from "@/theme/checks";
import { colors, pairs, tokensCss } from "@/theme/tokens";

const flagged = (file: string, source: string) => rawStyleValues(file, source).map((found) => found.value);

describe("the raw value check", () => {
  it("catches colours written out in CSS, however they are written", () => {
    expect(flagged("a.css", ".a { color: #D81E2A; }")).toEqual(["#D81E2A"]);
    expect(flagged("a.css", ".a { background: rgb(29 59 102 / 8%); }")).toEqual(["rgb("]);
    expect(flagged("a.css", ".a { border: 1px solid hsl(12, 86%, 60%); }")).toEqual(["hsl("]);
    expect(flagged("a.css", ".a { color: white; }")).toEqual(["white"]);
    expect(flagged("a.css", ".a { box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1); }")).toEqual(["rgba("]);
  });

  it("catches font values written out in CSS", () => {
    expect(flagged("a.css", ".a { font-family: Inter, sans-serif; }")).toEqual(["font-family: Inter, sans-serif"]);
    expect(flagged("a.css", ".a { font-size: 15px; }")).toEqual(["font-size: 15px"]);
    expect(flagged("a.css", ".a { font-weight: 700; line-height: 22px; }")).toEqual(["font-weight: 700", "line-height: 22px"]);
    expect(flagged("a.css", ".a { font: 700 15px/22px Inter; }")).toEqual(["font: 700 15px/22px Inter"]);
  });

  it("catches colours and fonts written out in components", () => {
    expect(flagged("a.tsx", 'const themeColor = "#1D3B66";')).toEqual(["#1D3B66"]);
    expect(flagged("a.tsx", "<p style={{ fontSize: 15 }} />")).toEqual(["fontSize"]);
    expect(flagged("a.tsx", '<p style={{ color: "red" }} />')).toEqual(["color:"]);
  });

  it("lets tokens, inherited values and things that only look like colours through", () => {
    expect(flagged("a.css", ".a { color: var(--color-ink); background: transparent; border-color: currentColor; }")).toEqual([]);
    expect(flagged("a.css", ".a { font-size: var(--type-body-size); font-family: inherit; font: inherit; }")).toEqual([]);
    expect(flagged("a.css", ".good-feeling { white-space: nowrap; }")).toEqual([]);
    expect(flagged("a.tsx", "<span>#{feeling.hashtag}</span>")).toEqual([]);
  });
});

describe("the contrast check", () => {
  it("measures contrast the WCAG way", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 1);
    expect(contrastRatio("#1D3B66", "#FFFFFF")).toBeCloseTo(11.2, 1);
    expect(contrastRatio("#FFFFFF", "#D81E2A")).toBeCloseTo(5.1, 1);
  });

  it("fails text below 4.5:1, and large text or icons below 3:1", () => {
    const teal = { light: { ...colors.light, goodText: "#00B894" }, dark: colors.dark };
    const failures = contrastFailures(teal, [{ use: "Good badge", text: "goodText", background: "surface" }]);
    expect(failures).toEqual(["Good badge (light): goodText on surface is 2.54:1, needs 4.5:1"]);
    expect(contrastFailures(teal, [{ use: "Good icon", text: "goodText", background: "surface", large: true }])).toEqual([
      "Good icon (light): goodText on surface is 2.54:1, needs 3:1",
    ]);
  });

  it("covers every colour and background the stylesheet sets together", () => {
    const declared = new Set(pairs.map((pair) => `${pair.text} on ${pair.background}`));
    const undeclared = pairsSetInCss(readFileSync("app/globals.css", "utf8")).filter((pair) => !declared.has(pair));
    expect(undeclared).toEqual([]);
  });
});

describe("the tokens", () => {
  it("give every colour a light and a dark value", () => {
    expect(Object.keys(colors.dark).sort()).toEqual(Object.keys(colors.light).sort());
    const css = tokensCss();
    expect(css).toContain("@media (prefers-color-scheme: dark)");
    expect(css).toContain("--color-ink: #12131A");
  });
});
