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
    /** Dusk Violet. */
    badFill: "#6B4E96",
    badText: "#6B4E96",
    badTint: "#EDEAF2",
    neutralTint: "#F2F2F4",
    warning: "#FFB800",
    warningTint: "#FFF6E0",
    /** Outlines and icons of error states; the message itself is in ink. Never a solid red button. */
    error: "#E74C3C",
    info: "#3498DB",
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
    badFill: "#6B4E96",
    badText: "#B39DDB",
    badTint: "#363347",
    neutralTint: "#30313E",
    warning: "#FFB800",
    warningTint: "#423724",
    error: "#E74C3C",
    info: "#3498DB",
  },
} as const;

export type ColorName = keyof typeof colors.light;
export type Palette = Record<ColorName, string>;

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
  { use: "Form fields", text: "ink", background: "surface" },
  { use: "Form field border", text: "line", background: "surface", large: true },
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
  return [
    `:root { color-scheme: light dark; ${[...shared, ...mode("light")].join(" ")} }`,
    `@media (prefers-color-scheme: dark) { :root { ${mode("dark").join(" ")} } }`,
  ].join("\n");
}
