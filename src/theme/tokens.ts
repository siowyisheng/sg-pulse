import type { Design } from "@/core/design";
/**
 * The theme: every colour, font, type style, space, radius and shadow the app may use, in light and
 * dark mode. `docs/style-guide.md` is the reference these follow; nothing outside this file may
 * write a colour or font value out (see ./checks.ts).
 */

/** Colours by what they are for. Light and dark have the same names. */
export const colors = {
  light: {
    /** Page background. */
    background: "#F5F6FA",
    /** Cards. */
    surface: "#FFFFFF",
    /** Modals and other raised surfaces. */
    surfaceRaised: "#FFFFFF",
    ink: "#12131A",
    /** Secondary text. */
    inkMuted: "#5D6070",
    /** Borders, disabled states and placeholder icons: never body text. */
    line: "#8F92A1",
    /** Pulse Navy as a solid fill: the header and the secondary button. The same in both modes. */
    primary: "#1D3B66",
    primaryHover: "#152C4D",
    /** Pulse Navy as text: links, active states, Byline chips. */
    primaryText: "#1D3B66",
    primaryTint: "#E4E7ED",
    /** Merlion Red: the Yah Lah button and key highlights. */
    accent: "#D81E2A",
    accentHover: "#B5121F",
    /** Text and icons on a navy or red fill. */
    onSolid: "#FFFFFF",
    /** Sunrise Teal as a fill only: too light for text or icons on white. */
    goodFill: "#00B894",
    goodText: "#00806A",
    goodTint: "#EBF9F6",
    /** A stronger wash of teal, for a highlighter stroke or a glow behind ink. */
    goodHighlight: "#9EE4D6",
    /** Dusk Violet. */
    badFill: "#6B4E96",
    badText: "#6B4E96",
    badTint: "#EDEAF2",
    /** A stronger wash of violet, for a highlighter stroke or a glow behind ink. */
    badHighlight: "#D3CAE0",
    neutralTint: "#F2F2F4",
    warning: "#FFB800",
    warningTint: "#FFF6E0",
    /** Outlines and icons of error states; the message itself is in ink. Never a solid red button. */
    error: "#E74C3C",
    info: "#3498DB",
    /** Decoration only (background patterns, ornaments, route lines): never text, and never the only sign of anything. */
    decorA: "#E4E7ED",
    decorB: "#00B894",
    decorC: "#6B4E96",
  },
  dark: {
    background: "#12131A",
    surface: "#1E1F2B",
    surfaceRaised: "#1E1F2B",
    ink: "#FFFFFF",
    inkMuted: "#A9ACBA",
    line: "#8F92A1",
    primary: "#1D3B66",
    primaryHover: "#152C4D",
    primaryText: "#7BA7EA",
    primaryTint: "#2D354A",
    accent: "#D81E2A",
    accentHover: "#B5121F",
    onSolid: "#FFFFFF",
    goodFill: "#00B894",
    goodText: "#00B894",
    goodTint: "#19373C",
    goodHighlight: "#0B5248",
    badFill: "#6B4E96",
    badText: "#B39DDB",
    badTint: "#363347",
    badHighlight: "#43335E",
    neutralTint: "#30313E",
    warning: "#FFB800",
    warningTint: "#423724",
    error: "#E74C3C",
    info: "#3498DB",
    decorA: "#2D354A",
    decorB: "#00B894",
    decorC: "#6B4E96",
  },
} as const;

export type ColorName = keyof typeof colors.light;
export type Palette = Record<ColorName, string>;

/**
 * The Designs other than Classic (see src/core/design.ts): each a whole palette, light and dark,
 * plus its own display type and shapes. Every pair in `pairs` is checked in every Design.
 */
export interface DesignTokens {
  light: Palette;
  dark: Palette;
  /** The display face, as a font stack; the body stays Inter. */
  display: string;
  radii: Partial<Record<keyof typeof radii, string>>;
}

const shared = { warning: "#FFB800", error: "#E74C3C", info: "#3498DB", onSolid: "#FFFFFF" } as const;

export const designs: Record<Exclude<Design, "classic">, DesignTokens> = {
  /** Kopitiam: enamel-green cups, kopi brown, kaya gold, a floor of green and white tiles. */
  kopitiam: {
    light: {
      ...shared,
      background: "#F4F9F5", surface: "#FFFFFF", surfaceRaised: "#FFFFFF", ink: "#2A1A10", inkMuted: "#6B5446", line: "#A08C7E",
      primary: "#1F6B45", primaryHover: "#17533A", primaryText: "#1F6B45", primaryTint: "#E1EFE6",
      accent: "#C8102E", accentHover: "#A00D25",
      goodFill: "#E8A33D", goodText: "#8A5300", goodTint: "#FDF1DC", goodHighlight: "#F7D497",
      badFill: "#6B3E26", badText: "#6B3E26", badTint: "#F1E6DF", badHighlight: "#DDC2B2",
      neutralTint: "#F1EFEC", warningTint: "#FFF6E0", decorA: "#DDEEE2", decorB: "#1F6B45", decorC: "#E8A33D",
    },
    dark: {
      ...shared,
      background: "#1A120D", surface: "#2A1E17", surfaceRaised: "#2A1E17", ink: "#FFF8F0", inkMuted: "#C9B8AA", line: "#8F7E72",
      primary: "#1F6B45", primaryHover: "#17533A", primaryText: "#7FD1A3", primaryTint: "#23382C",
      accent: "#C8102E", accentHover: "#A00D25",
      goodFill: "#E8A33D", goodText: "#F2B95C", goodTint: "#3A2A14", goodHighlight: "#5C4316",
      badFill: "#A66B4A", badText: "#D9A88A", badTint: "#35241C", badHighlight: "#4F3326",
      neutralTint: "#362A22", warningTint: "#423724", decorA: "#241A14", decorB: "#1F6B45", decorC: "#E8A33D",
    },
    display: "var(--font-baloo), var(--font-jakarta), sans-serif",
    radii: { card: "18px", button: "14px", modal: "26px" },
  },
  /** Hawker signboard: black boards, red lettering, sign yellow, blue plastic stools. */
  hawker: {
    light: {
      ...shared,
      background: "#FFF8DB", surface: "#FFFFFF", surfaceRaised: "#FFFFFF", ink: "#141414", inkMuted: "#55514A", line: "#8A8478",
      primary: "#1A1A1A", primaryHover: "#000000", primaryText: "#B01E17", primaryTint: "#FBE3D8",
      accent: "#D7261E", accentHover: "#B01E17",
      goodFill: "#FFC629", goodText: "#7A5600", goodTint: "#FFF1BF", goodHighlight: "#FFE07A",
      badFill: "#1F4E9E", badText: "#1F4E9E", badTint: "#E3EBF8", badHighlight: "#B8CBEC",
      neutralTint: "#F3F0E6", warningTint: "#FFF6E0", decorA: "#FFC629", decorB: "#D7261E", decorC: "#1F4E9E",
    },
    dark: {
      ...shared,
      background: "#141210", surface: "#221F1A", surfaceRaised: "#221F1A", ink: "#FFFFFF", inkMuted: "#BDB6A8", line: "#8A8478",
      primary: "#1A1A1A", primaryHover: "#000000", primaryText: "#FF8A80", primaryTint: "#3D2220",
      accent: "#D7261E", accentHover: "#B01E17",
      goodFill: "#FFC629", goodText: "#FFD54F", goodTint: "#3A3115", goodHighlight: "#5A4A12",
      badFill: "#3B6FC9", badText: "#8FB3F0", badTint: "#1D2A40", badHighlight: "#26406B",
      neutralTint: "#2E2A23", warningTint: "#423724", decorA: "#FFC629", decorB: "#D7261E", decorC: "#3B6FC9",
    },
    display: "var(--font-anton), var(--font-jakarta), sans-serif",
    radii: { card: "6px", button: "6px", modal: "10px" },
  },
  /** Pasar malam: the night market after dark, whatever the phone's setting, under lantern-yellow, neon-pink and cyan strings of lights. */
  "pasar-malam": {
    light: {
      ...shared,
      background: "#160E2E", surface: "#241845", surfaceRaised: "#2C1F52", ink: "#FFF6FB", inkMuted: "#C7BBDD", line: "#8E80AE",
      primary: "#2A1450", primaryHover: "#1E0E3A", primaryText: "#FFD166", primaryTint: "#3A2A63",
      accent: "#C2185B", accentHover: "#9E1249",
      goodFill: "#FFD166", goodText: "#FFD166", goodTint: "#3B2A4A", goodHighlight: "#6A4A12",
      badFill: "#3EC6E0", badText: "#6FDDF0", badTint: "#1D2F55", badHighlight: "#1C4F6B",
      neutralTint: "#33275A", warningTint: "#3F3520", error: "#FF6B5B", decorA: "#FFD166", decorB: "#FF3D7F", decorC: "#3EC6E0",
    },
    dark: {
      ...shared,
      background: "#160E2E", surface: "#241845", surfaceRaised: "#2C1F52", ink: "#FFF6FB", inkMuted: "#C7BBDD", line: "#8E80AE",
      primary: "#2A1450", primaryHover: "#1E0E3A", primaryText: "#FFD166", primaryTint: "#3A2A63",
      accent: "#C2185B", accentHover: "#9E1249",
      goodFill: "#FFD166", goodText: "#FFD166", goodTint: "#3B2A4A", goodHighlight: "#6A4A12",
      badFill: "#3EC6E0", badText: "#6FDDF0", badTint: "#1D2F55", badHighlight: "#1C4F6B",
      neutralTint: "#33275A", warningTint: "#3F3520", error: "#FF6B5B", decorA: "#FFD166", decorB: "#FF3D7F", decorC: "#3EC6E0",
    },
    display: "var(--font-righteous), var(--font-jakarta), sans-serif",
    radii: { card: "20px", button: "999px", modal: "24px" },
  },
  /** Peranakan: shophouse tiles in mint, nyonya pink and cobalt. */
  peranakan: {
    light: {
      ...shared,
      background: "#F6FBF9", surface: "#FFFFFF", surfaceRaised: "#FFFFFF", ink: "#1E1B2E", inkMuted: "#5B5770", line: "#8E8AA3",
      primary: "#2B4C9B", primaryHover: "#213A78", primaryText: "#2B4C9B", primaryTint: "#E4EAF7",
      accent: "#C2185B", accentHover: "#9E1249",
      goodFill: "#3FB59A", goodText: "#127A62", goodTint: "#E3F5EF", goodHighlight: "#A9E2D3",
      badFill: "#7B3F8C", badText: "#7B3F8C", badTint: "#F1E6F4", badHighlight: "#DCC2E4",
      neutralTint: "#F2F0F5", warningTint: "#FFF6E0", decorA: "#8FD3C1", decorB: "#F29BB5", decorC: "#2B4C9B",
    },
    dark: {
      ...shared,
      background: "#12162A", surface: "#1D2240", surfaceRaised: "#1D2240", ink: "#FFFFFF", inkMuted: "#B4B8D2", line: "#8E8AA3",
      primary: "#2B4C9B", primaryHover: "#213A78", primaryText: "#9DB4F2", primaryTint: "#2A3360",
      accent: "#C2185B", accentHover: "#9E1249",
      goodFill: "#3FB59A", goodText: "#6FD9BE", goodTint: "#173A39", goodHighlight: "#1F5A50",
      badFill: "#B06BC2", badText: "#D4A3E0", badTint: "#33264A", badHighlight: "#4E3266",
      neutralTint: "#2A2E4A", warningTint: "#423724", decorA: "#23524A", decorB: "#5E2A45", decorC: "#2B4C9B",
    },
    display: "var(--font-young-serif), Georgia, serif",
    radii: { card: "4px", button: "4px", modal: "8px" },
  },
  /** MRT: the line colours, station dots and plain wayfinding type. */
  mrt: {
    light: {
      ...shared,
      background: "#F7F8FA", surface: "#FFFFFF", surfaceRaised: "#FFFFFF", ink: "#101820", inkMuted: "#56606B", line: "#8A939C",
      primary: "#222B33", primaryHover: "#11171C", primaryText: "#005EC4", primaryTint: "#E3EEFA",
      accent: "#D42E12", accentHover: "#B02510",
      goodFill: "#009645", goodText: "#007A38", goodTint: "#E3F4EA", goodHighlight: "#A6DDBB",
      badFill: "#9900AA", badText: "#8A0099", badTint: "#F3E3F5", badHighlight: "#E0B3E6",
      neutralTint: "#F0F2F4", warningTint: "#FFF6E0", decorA: "#FA9E0D", decorB: "#005EC4", decorC: "#9D5B25",
    },
    dark: {
      ...shared,
      background: "#0E1318", surface: "#1A2129", surfaceRaised: "#1A2129", ink: "#FFFFFF", inkMuted: "#A9B3BD", line: "#8A939C",
      primary: "#222B33", primaryHover: "#11171C", primaryText: "#6FB1FF", primaryTint: "#1F3550",
      accent: "#D42E12", accentHover: "#B02510",
      goodFill: "#009645", goodText: "#3CCB7A", goodTint: "#12301F", goodHighlight: "#0E5A30",
      badFill: "#B23CC2", badText: "#D88BE3", badTint: "#2E1A33", badHighlight: "#55205E",
      neutralTint: "#262E37", warningTint: "#423724", decorA: "#FA9E0D", decorB: "#005EC4", decorC: "#9D5B25",
    },
    display: "var(--font-inter), sans-serif",
    radii: { card: "12px", button: "999px", modal: "20px" },
  },
  /** Void deck: HDB block paint in salmon, sky and lime, over a terrazzo floor. */
  "void-deck": {
    light: {
      ...shared,
      background: "#F2F4F5", surface: "#FFFFFF", surfaceRaised: "#FFFFFF", ink: "#1B1D21", inkMuted: "#575C64", line: "#8D939B",
      primary: "#C2412E", primaryHover: "#A33525", primaryText: "#B23A28", primaryTint: "#FBE6E2",
      accent: "#1F5FA8", accentHover: "#174A84",
      goodFill: "#8CC63F", goodText: "#4D7A12", goodTint: "#EEF6E0", goodHighlight: "#C9E79A",
      badFill: "#3E8FC4", badText: "#1F6596", badTint: "#E1EFF8", badHighlight: "#B3D7EE",
      neutralTint: "#ECEEF0", warningTint: "#FFF6E0", decorA: "#F28C7A", decorB: "#6EC1E4", decorC: "#B5D86A",
    },
    dark: {
      ...shared,
      background: "#16181B", surface: "#22252A", surfaceRaised: "#22252A", ink: "#FFFFFF", inkMuted: "#B2B7BF", line: "#8D939B",
      primary: "#C2412E", primaryHover: "#A33525", primaryText: "#FF9C8C", primaryTint: "#3D2622",
      accent: "#1F5FA8", accentHover: "#174A84",
      goodFill: "#8CC63F", goodText: "#A8DB62", goodTint: "#26321A", goodHighlight: "#3D5A1C",
      badFill: "#3E8FC4", badText: "#84C2EC", badTint: "#1B2C3A", badHighlight: "#1F4A66",
      neutralTint: "#2C3036", warningTint: "#423724", decorA: "#8C4A40", decorB: "#2F6680", decorC: "#5E7A33",
    },
    display: "var(--font-bricolage), var(--font-jakarta), sans-serif",
    radii: { card: "28px", button: "18px", modal: "32px" },
  },
  /** Garden City: deep leaf green, orchid magenta, sunshine and supertree violet. */
  "garden-city": {
    light: {
      ...shared,
      background: "#F1F8F3", surface: "#FFFFFF", surfaceRaised: "#FFFFFF", ink: "#10241A", inkMuted: "#4E6357", line: "#86998D",
      primary: "#0F5C45", primaryHover: "#0A4434", primaryText: "#0F6B50", primaryTint: "#DDEFE5",
      accent: "#C2187A", accentHover: "#9C1262",
      goodFill: "#F5B700", goodText: "#8A5F00", goodTint: "#FFF4D1", goodHighlight: "#FFDF80",
      badFill: "#5B5FC7", badText: "#4A4EB3", badTint: "#E8E9F8", badHighlight: "#C4C6EF",
      neutralTint: "#ECF2EE", warningTint: "#FFF6E0", decorA: "#7BC67E", decorB: "#E879B9", decorC: "#6C4BA8",
    },
    dark: {
      ...shared,
      background: "#0B1A14", surface: "#15281F", surfaceRaised: "#15281F", ink: "#F2FFF7", inkMuted: "#A9C2B4", line: "#86998D",
      primary: "#0F5C45", primaryHover: "#0A4434", primaryText: "#6FD6A8", primaryTint: "#1E3A2E",
      accent: "#C2187A", accentHover: "#9C1262",
      goodFill: "#F5B700", goodText: "#FFCF4D", goodTint: "#33300F", goodHighlight: "#5A4A0A",
      badFill: "#7F83E0", badText: "#A9ACF2", badTint: "#22244A", badHighlight: "#34386E",
      neutralTint: "#20352B", warningTint: "#423724", decorA: "#2E5E3A", decorB: "#6B2A52", decorC: "#3E2E6B",
    },
    display: "var(--font-fredoka), var(--font-jakarta), sans-serif",
    radii: { card: "28px 28px 28px 8px", button: "999px", modal: "28px" },
  },
};

/** The loaded fonts come in as variables set by next/font in app/layout.tsx; the rest are fallbacks. */
export const fonts = {
  body: "var(--font-inter), Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  display: "var(--font-jakarta), 'Plus Jakarta Sans', var(--font-inter), sans-serif",
} as const;

export const typeScale = {
  h1: { size: "32px", line: "40px", weight: "800", tracking: "-0.02em" },
  h2: { size: "24px", line: "32px", weight: "700", tracking: "-0.01em" },
  h3: { size: "18px", line: "24px", weight: "600", tracking: "0em" },
  body: { size: "15px", line: "22px", weight: "400", tracking: "0em" },
  bodyBold: { size: "15px", line: "22px", weight: "600", tracking: "0em" },
  caption: { size: "13px", line: "18px", weight: "500", tracking: "0.01em" },
  badge: { size: "11px", line: "14px", weight: "700", tracking: "0.05em" },
  /** The Designs' biggest display type: a front-page date or a signboard word. */
  hero: { size: "40px", line: "44px", weight: "800", tracking: "-0.02em" },
  /** A large emoji standing for a mood on the voting screen. */
  emoji: { size: "72px", line: "80px", weight: "400", tracking: "0em" },
} as const;

/** The 8px grid. */
export const space = { xs: "4px", sm: "8px", md: "16px", lg: "24px", xl: "32px", xxl: "48px" } as const;

export const radii = { button: "12px", card: "16px", pill: "999px", modal: "24px" } as const;

export const sizes = {
  /** The smallest thing a finger is asked to hit. */
  touchTarget: "44px",
  header: "56px",
  /** The widest a column of reading gets. */
  column: "560px",
  /** How much of the voting screen shows under the first screen, so it is plain there is more below. */
  peek: "64px",
  /** The round "+" on the voting screen. */
  writeButton: "56px",
  /** The ad slot: a standard mobile banner. */
  adWidth: "320px",
  adHeight: "50px",
} as const;

export const shadows = {
  light: { card: "0px 4px 20px rgba(29, 59, 102, 0.08)", modal: "0px 12px 32px rgba(18, 19, 26, 0.24)", scrim: "rgba(18, 19, 26, 0.56)" },
  dark: { card: "0px 4px 20px rgba(0, 0, 0, 0.32)", modal: "0px 12px 32px rgba(0, 0, 0, 0.56)", scrim: "rgba(0, 0, 0, 0.64)" },
} as const;

export interface ColorPair {
  /** Where the pair is used. */
  use: string;
  text: ColorName;
  background: ColorName;
  /** Large text (24px, or 18.66px bold) and icons need 3:1; everything else 4.5:1. */
  large?: boolean;
}

/**
 * Every text (or icon) colour the components put on a background. Checked for contrast in light and
 * dark mode; a colour and background set together in the stylesheet must be listed here.
 */
export const pairs: ColorPair[] = [
  { use: "Body text on the page", text: "ink", background: "background" },
  { use: "Secondary text on the page", text: "inkMuted", background: "background" },
  { use: "Links on the page", text: "primaryText", background: "background" },
  { use: "Text on a card", text: "ink", background: "surface" },
  { use: "Secondary text on a card", text: "inkMuted", background: "surface" },
  { use: "Links on a card", text: "primaryText", background: "surface" },
  { use: "A chosen option in a neutral choice, such as Problem or Suggestion", text: "primaryText", background: "neutralTint" },
  { use: "Good Hashtag and label on a card", text: "goodText", background: "surface" },
  { use: "Bad Hashtag and label on a card", text: "badText", background: "surface" },
  { use: "Text in a modal", text: "ink", background: "surfaceRaised" },
  { use: "Secondary text in a modal", text: "inkMuted", background: "surfaceRaised" },
  { use: "Header", text: "onSolid", background: "primary" },
  { use: "Yah Lah button", text: "onSolid", background: "accent" },
  { use: "Yah Lah button, pressed", text: "onSolid", background: "accentHover" },
  { use: "Secondary button", text: "onSolid", background: "primary" },
  { use: "Secondary button, pressed", text: "onSolid", background: "primaryHover" },
  { use: "Ghost button on the page", text: "ink", background: "background" },
  { use: "Ghost button on a card", text: "ink", background: "surface" },
  { use: "Ghost button, pressed", text: "ink", background: "neutralTint" },
  { use: "Ghost button border on a card", text: "line", background: "surface", large: true },
  { use: "Good Feeling badge", text: "goodText", background: "goodTint" },
  { use: "Bad Feeling badge", text: "badText", background: "badTint" },
  { use: "Byline and From the team chips", text: "primaryText", background: "primaryTint" },
  { use: "Queued for tomorrow and Still feeling it chips", text: "ink", background: "neutralTint" },
  { use: "Under review chip and the demo banner", text: "ink", background: "warningTint" },
  { use: "Error outline and icon on a card", text: "error", background: "surface", large: true },
  { use: "Error outline and icon on the page", text: "error", background: "background", large: true },
  { use: "Good mood on the voting screen", text: "goodText", background: "goodTint" },
  { use: "Bad mood on the voting screen", text: "badText", background: "badTint" },
  { use: "Write a Feeling button", text: "onSolid", background: "primary" },
  { use: "Correction notice", text: "ink", background: "warningTint" },
  { use: "Form fields", text: "ink", background: "surface" },
  { use: "Form field border", text: "line", background: "surface", large: true },
  { use: "Front page looks: text on a Good field or highlighter stroke", text: "ink", background: "goodHighlight" },
  { use: "Front page looks: text on a Bad field or highlighter stroke", text: "ink", background: "badHighlight" },
  { use: "Front page looks: text on a Good tint", text: "ink", background: "goodTint" },
  { use: "Front page looks: text on a Bad tint", text: "ink", background: "badTint" },
  { use: "Front page looks: secondary text on a Good tint", text: "inkMuted", background: "goodTint" },
  { use: "Front page looks: secondary text on a Bad tint", text: "inkMuted", background: "badTint" },
  { use: "Front page looks: Good Hashtag on a Good tint", text: "goodText", background: "goodTint" },
  { use: "Front page looks: Bad Hashtag on a Bad tint", text: "badText", background: "badTint" },
  { use: "Front page looks: Good icon on a Good field", text: "goodText", background: "goodHighlight", large: true },
  { use: "Front page looks: Bad icon on a Bad field", text: "badText", background: "badHighlight", large: true },
];

const kebab = (name: string) => name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

const declarations = (prefix: string, values: Record<string, string>) =>
  Object.entries(values).map(([name, value]) => `--${prefix}-${kebab(name)}: ${value};`);

/** The tokens as CSS custom properties: light by default, dark when the device asks for it. */
export function tokensCss(): string {
  const shared = [
    ...declarations("font", fonts),
    ...Object.entries(typeScale).flatMap(([name, style]) => declarations(`type-${kebab(name)}`, style)),
    ...declarations("space", space),
    ...declarations("radius", radii),
    ...declarations("size", sizes),
  ];
  const mode = (name: "light" | "dark") => [...declarations("color", colors[name]), ...declarations("shadow", shadows[name])];
  const designLight = Object.entries(designs).map(
    ([name, design]) =>
      `html[data-design="${name}"] { ${[...declarations("color", design.light), `--font-display: ${design.display};`, ...declarations("radius", design.radii)].join(" ")} }`,
  );
  const designDark = Object.entries(designs).map(([name, design]) => `html[data-design="${name}"] { ${declarations("color", design.dark).join(" ")} }`);
  return [
    `:root { color-scheme: light dark; ${[...shared, ...mode("light")].join(" ")} }`,
    `@media (prefers-color-scheme: dark) { :root { ${mode("dark").join(" ")} } }`,
    ...designLight,
    `@media (prefers-color-scheme: dark) { ${designDark.join(" ")} }`,
  ].join("\n");
}
