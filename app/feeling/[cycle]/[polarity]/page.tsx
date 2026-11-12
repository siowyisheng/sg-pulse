import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getApp } from "@/composition";
import { PolarityBadge } from "@/ui/badges";
import { Card } from "@/ui/card";
import { PublishedFeelingBody } from "@/ui/published-feeling";
import { formatCycle } from "@/web/format";
import { POLARITY_LABEL, polarityFrom } from "@/web/polarity";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ cycle: string; polarity: string }> };

async function find(params: Props["params"]) {
  const { cycle, polarity } = await params;
  const known = polarityFrom(polarity);
  return known ? (await getApp()).published(cycle, known) : null;
}

/** The preview carries the text and Hashtag only: the Byline is on the page, not in what gets passed around. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const feeling = await find(params);
  if (!feeling) return { title: "Yah Lah" };
  const title = `${POLARITY_LABEL[feeling.polarity]} Feeling of the Day, ${formatCycle(feeling.cycle)} · Yah Lah`;
  const description = `${feeling.text} #${feeling.hashtag}${feeling.correctionNotice ? ` (Correction notice: ${feeling.correctionNotice})` : ""}`;
  return { title, description, openGraph: { title, description, siteName: "Yah Lah", type: "article" }, twitter: { card: "summary_large_image", title, description } };
}

/** What a share link opens: one Feeling of the Day, on the day it was chosen. Candidates have no such page. */
export default async function SharedFeeling({ params }: Props) {
  const feeling = await find(params);
  if (!feeling) notFound();
  return (
    <main className="page">
      <h1 className="page-title">
        <PolarityBadge polarity={feeling.polarity} /> Feeling of the Day
      </h1>
      <p className="muted">
        <time dateTime={feeling.cycle}>{formatCycle(feeling.cycle)}</time>
      </p>
      <Card as="article" className={`stack wide feeling-${feeling.polarity} edged`}>
        <PublishedFeelingBody feeling={feeling} size="large" />
      </Card>
      <p className="actions">
        <a className="button button-secondary" href="/">
          See how Singapore is feeling today
        </a>
      </p>
    </main>
  );
}
