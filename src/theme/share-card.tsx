import type { SharePreview } from "@/core/feelings";
import { colors } from "./tokens";

/**
 * The picture shown when a Feeling of the Day's link is shared: its text and Hashtag, and nothing
 * about who wrote it. Drawn for the image renderer, which takes only inline styles; every colour
 * still comes from the tokens.
 */
export const SHARE_CARD_SIZE = { width: 1200, height: 630 } as const;

export function ShareCard({ preview }: { preview: SharePreview }) {
  const palette = colors.light;
  const accent = preview.polarity === "good" ? palette.goodText : palette.badText;
  const tint = preview.polarity === "good" ? palette.goodTint : palette.badTint;
  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: palette.background, color: palette.ink }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "32px 56px", background: palette.primary, color: palette.onSolid }}>
        <div style={{ fontSize: 44, fontWeight: 800 }}>Yah Lah</div>
        <div style={{ fontSize: 28 }}>How&apos;s Singapore feeling today?</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, justifyContent: "center", padding: "0 56px", borderLeft: `24px solid ${accent}` }}>
        <div style={{ display: "flex" }}>
          <div style={{ padding: "8px 24px", borderRadius: 999, border: `3px solid ${accent}`, background: tint, color: accent, fontSize: 28, fontWeight: 700, letterSpacing: 2 }}>
            {preview.polarity === "good" ? "GOOD FEELING OF THE DAY" : "BAD FEELING OF THE DAY"}
          </div>
        </div>
        <div style={{ marginTop: 32, fontSize: preview.text.length > 60 ? 60 : 76, fontWeight: 700, lineHeight: 1.2 }}>{preview.text}</div>
        <div style={{ marginTop: 32, fontSize: 44, fontWeight: 700, color: accent }}>{`#${preview.hashtag}`}</div>
      </div>
    </div>
  );
}
