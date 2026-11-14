import type { Design, FrontPageLook } from "@/core/app";

/** What the Admin area and the preview bar say about each Design. */
export const DESIGN_DESCRIPTIONS: Record<Design, { name: string; emoji: string; description: string }> = {
  classic: { name: "Classic", emoji: "🧭", description: "The site as first built: navy, teal and violet, with icons and no emojis. Its first screen is the Front page look below." },
  kopitiam: { name: "Kopitiam", emoji: "☕", description: "Enamel-green cups, kopi brown and kaya gold on a floor of green and white tiles. The Feelings are two cups on the table." },
  hawker: { name: "Hawker signboard", emoji: "🍜", description: "Black stall boards with red lettering and sign yellow. Each Feeling hangs as a stall's signboard." },
  "pasar-malam": { name: "Pasar malam", emoji: "🏮", description: "The night market, dark even in the day, under strings of lantern, neon-pink and cyan lights." },
  peranakan: { name: "Peranakan tiles", emoji: "🌺", description: "Shophouse tiles in mint, nyonya pink and cobalt, with tile corners and a serif face." },
  mrt: { name: "MRT", emoji: "🚇", description: "Train line colours and plain signage type. The two Feelings are stations on a line, and the moods are platforms." },
  "void-deck": { name: "Void deck", emoji: "🏢", description: "HDB block paint in salmon, sky and lime over a terrazzo floor, with big friendly corners." },
  "garden-city": { name: "Garden City", emoji: "🌿", description: "Leaf green, orchid magenta, sunshine and supertree violet, on leaf-shaped cards." },
};

/** The first-screen layout each Design builds on; Classic uses the Front page look the Admin chose. */
export const DESIGN_FIRST_SCREEN: Record<Exclude<Design, "classic">, Exclude<FrontPageLook, "original">> = {
  kopitiam: "postcards",
  hawker: "postcards",
  "pasar-malam": "sunrise",
  peranakan: "postcards",
  mrt: "highlighter",
  "void-deck": "sunrise",
  "garden-city": "highlighter",
};
