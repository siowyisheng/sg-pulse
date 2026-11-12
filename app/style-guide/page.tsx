import type { Metadata } from "next";
import { colors, type ColorName } from "@/theme/tokens";
import { BylineChip, FromTheTeamChip, PolarityBadge, QueuedForTomorrowChip, StillFeelingItChip, UnderReviewChip } from "@/ui/badges";
import { Button } from "@/ui/buttons";
import { Card } from "@/ui/card";
import { ModalExample } from "./modal-example";

export const metadata: Metadata = { title: "Style guide · Yah Lah", robots: { index: false } };

const kebab = (name: string) => name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

/** The shared components and colours as they really render, to check against docs/style-guide.md. */
export default function StyleGuide() {
  return (
    <main className="gallery">
      <h1>Style guide</h1>
      <section>
        <h2>Buttons</h2>
        <div className="gallery-row">
          <Button variant="yah-lah">Yah Lah</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="yah-lah" disabled>
            Yah Lah
          </Button>
        </div>
      </section>
      <section>
        <h2>Badges and chips</h2>
        <div className="gallery-row">
          <PolarityBadge polarity="good" />
          <PolarityBadge polarity="bad" />
          <BylineChip>TA · M · 30s</BylineChip>
          <FromTheTeamChip />
          <QueuedForTomorrowChip />
          <StillFeelingItChip />
          <UnderReviewChip />
        </div>
      </section>
      <section>
        <h2>Card and modal</h2>
        <div className="gallery-row">
          <Card>
            <h3>A card</h3>
            <p>Body text on a card.</p>
            <p className="caption muted">Caption and metadata.</p>
            <p>
              <a href="/">A link</a>
            </p>
          </Card>
          <ModalExample />
        </div>
      </section>
      <section>
        <h2>Colours</h2>
        <div className="gallery-row">
          {(Object.keys(colors.light) as ColorName[]).map((name) => (
            <span key={name} className="swatch" title={name} style={{ ["--swatch" as string]: `var(--color-${kebab(name)})` }} />
          ))}
        </div>
      </section>
    </main>
  );
}
