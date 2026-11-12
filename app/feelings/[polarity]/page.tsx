import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getApp } from "@/composition";
import { PolarityBadge } from "@/ui/badges";
import { Card } from "@/ui/card";
import { POLARITY_LABEL, polarityFrom } from "@/web/polarity";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ polarity: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const polarity = polarityFrom((await params).polarity);
  return { title: polarity ? `${POLARITY_LABEL[polarity]} Feelings today · Yah Lah` : "Yah Lah" };
}

/** A Polarity's word cloud: today's Hashtags, bigger the more Feelings use them. Open to everyone. */
export default async function WordCloud({ params }: Props) {
  const polarity = polarityFrom((await params).polarity);
  if (!polarity) notFound();
  const cloud = await (await getApp()).wordCloud(polarity);
  return (
    <main className="page">
      <a className="back-link" href="/">
        <ChevronLeft aria-hidden="true" size={20} /> Feelings of the Day
      </a>
      <h1 className="page-title">
        <PolarityBadge polarity={polarity} /> Feelings today
      </h1>
      {cloud.length === 0 ? (
        <Card className="stack">
          <p>No {POLARITY_LABEL[polarity]} Feelings yet today.</p>
          <a href="/submit">Write the first one</a>
        </Card>
      ) : (
        <>
          <p className="muted">Pick a Hashtag. The bigger it is, the more Feelings are about it.</p>
          <Card as="section" aria-label="Hashtags">
            <ul className="cloud">
              {cloud.map((word) => (
                <li key={word.hashtag}>
                  <a className={`cloud-word cloud-${word.size} hashtag-${polarity}`} href={`/feelings/${polarity}/${encodeURIComponent(word.hashtag)}`}>
                    #{word.hashtag}
                  </a>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </main>
  );
}
