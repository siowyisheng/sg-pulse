import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { colors, designs, pairs, type ColorPair, type Palette } from "./tokens";

/** What keeps the app from drifting off the style guide: run by the tests and before every build. */

export interface RawValue {
  file: string;
  line: number;
  /** The offending text. */
  value: string;
}

/** Where colour and font values may be written out. */
const TOKENS_FILE = "src/theme/tokens.ts";
/** Everything that draws something. */
const STYLED_FOLDERS = ["app", "src/ui", "src/web"];

const COLOR_FUNCTION = /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/g;
const HEX_COLOR = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g;
const NAMED_COLOR =
  /\b(?:white|black|red|green|blue|yellow|orange|purple|pink|brown|gr[ae]y|silver|gold|navy|teal|violet|indigo|cyan|magenta|maroon|olive|lime|aqua|fuchsia|coral|crimson|tomato|salmon|khaki|beige|ivory)\b/gi;
const COLOR_PROPERTY = /^(?:color|background(?:-color)?|border(?:-[a-z]+)*|outline(?:-color)?|fill|stroke|box-shadow|text-shadow|caret-color|accent-color|text-decoration(?:-color)?)$/;
const FONT_PROPERTY = /^(?:font|font-family|font-size|font-weight|line-height|letter-spacing)$/;
/** A font value that names nothing itself. */
const FONT_VALUE_ALLOWED = /^(?:var\(--[a-z0-9-]+\)|inherit|normal)$/;
const STYLE_PROP = /\b(?:fontFamily|fontSize|fontWeight|lineHeight|letterSpacing|backgroundColor|borderColor)\b|\b(?:color|background|fill|stroke):/g;

function rawValuesInCss(source: string): { index: number; value: string }[] {
  const found: { index: number; value: string }[] = [];
  const css = source.replace(/\/\*[\s\S]*?\*\//g, (comment) => " ".repeat(comment.length));
  for (const declaration of css.matchAll(/([a-z-]+)\s*:\s*([^;{}]+)/g)) {
    const [, property, rawValue] = declaration as unknown as [string, string, string];
    const value = rawValue.trim();
    const at = declaration.index;
    if (FONT_PROPERTY.test(property)) {
      if (!FONT_VALUE_ALLOWED.test(value)) found.push({ index: at, value: `${property}: ${value}` });
      continue;
    }
    if (property.startsWith("--")) continue;
    for (const match of value.matchAll(COLOR_FUNCTION)) found.push({ index: at, value: match[0] });
    for (const match of value.matchAll(HEX_COLOR)) found.push({ index: at, value: match[0] });
    if (COLOR_PROPERTY.test(property)) {
      const withoutVariables = value.replace(/var\([^)]*\)/g, "");
      for (const match of withoutVariables.matchAll(NAMED_COLOR)) found.push({ index: at, value: match[0] });
    }
  }
  return found;
}

function rawValuesInCode(source: string): { index: number; value: string }[] {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, (comment) => " ".repeat(comment.length)).replace(/(^|\s)\/\/.*$/gm, (comment) => " ".repeat(comment.length));
  return [HEX_COLOR, COLOR_FUNCTION, STYLE_PROP].flatMap((pattern) => [...code.matchAll(pattern)].map((match) => ({ index: match.index, value: match[0] })));
}

/** Colours and font values written out in one file's source, instead of taken from the tokens. */
export function rawStyleValues(file: string, source: string): RawValue[] {
  const found = file.endsWith(".css") ? rawValuesInCss(source) : rawValuesInCode(source);
  return found
    .sort((a, b) => a.index - b.index)
    .map(({ index, value }) => ({ file, line: source.slice(0, index).split("\n").length, value }));
}

function filesUnder(folder: string): string[] {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const path = join(folder, entry.name).replaceAll("\\", "/");
    if (entry.isDirectory()) return filesUnder(path);
    return /\.(?:css|tsx?)$/.test(entry.name) ? [path] : [];
  });
}

/** Every raw colour or font value in the app's pages, components and stylesheets. Empty when all is well. */
export function rawStyleValuesInProject(root = "."): RawValue[] {
  return STYLED_FOLDERS.flatMap((folder) => filesUnder(join(root, folder).replaceAll("\\", "/")))
    .filter((file) => !file.endsWith(TOKENS_FILE))
    .flatMap((file) => rawStyleValues(file, readFileSync(file, "utf8")));
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two #RRGGBB colours, from 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (lighter + 0.05) / (darker + 0.05);
}

/** The pairs that are too faint to read, as sentences. Empty when all is well. */
export function contrastFailures(palettes: { light: Palette; dark: Palette } = colors, checked: ColorPair[] = pairs): string[] {
  return (["light", "dark"] as const).flatMap((mode) =>
    checked.flatMap((pair) => {
      const ratio = contrastRatio(palettes[mode][pair.text], palettes[mode][pair.background]);
      const needed = pair.large ? 3 : 4.5;
      if (ratio >= needed) return [];
      return [`${pair.use} (${mode}): ${pair.text} on ${pair.background} is ${ratio.toFixed(2)}:1, needs ${needed}:1`];
    }),
  );
}

/** The same check in every Design other than Classic, each failure naming its Design. */
export function designContrastFailures(checked: ColorPair[] = pairs): string[] {
  return Object.entries(designs).flatMap(([name, design]) => contrastFailures(design, checked).map((failure) => `${name} Design: ${failure}`));
}

const camel = (name: string) => name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());

/** The "text on background" colour pairs a stylesheet sets in the same rule, by token name. */
export function pairsSetInCss(css: string): string[] {
  const found = new Set<string>();
  for (const rule of css.matchAll(/\{([^{}]*)\}/g)) {
    const body = rule[1] ?? "";
    const text = body.match(/(?:^|[;\s])color:\s*var\(--color-([a-z-]+)\)/)?.[1];
    const background = body.match(/background(?:-color)?:\s*var\(--color-([a-z-]+)\)/)?.[1];
    if (text && background) found.add(`${camel(text)} on ${camel(background)}`);
  }
  return [...found];
}

