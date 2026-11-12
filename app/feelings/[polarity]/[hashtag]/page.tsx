import { ChevronLeft, Shuffle } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getApp } from "@/composition";
import { bylineText } from "@/core/byline";
import { CANDIDATES_SHOWN } from "@/core/feelings";
import { BylineChip, PolarityBadge } from "@/ui/badges";
import { Card } from "@/ui/card";
import { decoded, POLARITY_LABEL, polarityFrom } from "@/web/polarity";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ polarity: string; hashtag: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { polarity, hashtag } = await params;
  return { title: `#${decoded(hashtag)} · ${POLARITY_LABEL[polarityFrom(polarity) ?? "good"]} Feelings · Yah Lah` };
}

/** Up to 10 of today's Candidates under a Hashtag, in jumbled order, with Bylines and no counts. Open to everyone. */
export default async function HashtagScreen({ params }: Props) {
  const raw = await params;
  const polarity = polarityFrom(raw.polarity);
  if (!polarity) notFound();
  const hashtag = decoded(raw.hashtag);
  const candidates = await (await getApp()).candidates({ polarity, hashtag });
  return (
    <main className="page">
      <a className="back-link" href={`/feelings/${polarity}`}>
        <ChevronLeft aria-hidden="true" size={20} /> {POLARITY_LABEL[polarity]} Hashtags
      </a>
      <h1 className="page-title">
        <PolarityBadge polarity={polarity} /> <span className={`hashtag-${polarity}`}>#{hashtag.replace(/^#+/, "").toLowerCase()}</span>
      </h1>
      {candidates.length === 0 && (
        <Card className="stack">
          <p>No Feelings under this Hashtag right now.</p>
          <a href="/submit">Write one</a>
        </Card>
      )}
      {candidates.map((candidate) => (
        <Card key={candidate.id} as="article" className="stack">
          <p className="candidate-text">{candidate.text}</p>
          <BylineChip>{bylineText(candidate.byline)}</BylineChip>
        </Card>
      ))}
      {candidates.length === CANDIDATES_SHOWN && (
        <p className="feeling-meta">
          <span className="caption muted">Up to {CANDIDATES_SHOWN} show at a time, in no particular order.</span>
          <a className="back-link" href={`/feelings/${polarity}/${encodeURIComponent(hashtag)}`}>
            <Shuffle aria-hidden="true" size={18} /> Show another mix
          </a>
        </p>
      )}
    </main>
  );
}
