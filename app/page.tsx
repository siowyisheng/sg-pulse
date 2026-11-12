import type { FeelingOfTheDay } from "@/core/app";
import type { Polarity } from "@/core/feeling-rules";
import { getApp } from "@/composition";
import { AdSlot } from "@/ui/ad-slot";
import { FromTheTeamChip, PolarityBadge } from "@/ui/badges";
import { Card } from "@/ui/card";
import { commercialSettings } from "@/web/commercial";
import { formatCycle } from "@/web/format";

// The Cycle comes from the time of each request, so this page is never built ahead of time.
export const dynamic = "force-dynamic";

function Feeling({ polarity, feeling }: { polarity: Polarity; feeling: FeelingOfTheDay | null }) {
  return (
    <Card as="article" className={`feeling feeling-${polarity}`} aria-labelledby={`${polarity}-title`}>
      <h2 id={`${polarity}-title`} className="feeling-title">
        <PolarityBadge polarity={polarity} /> Feeling of the Day
      </h2>
      {feeling ? (
        <>
          <p className="feeling-text">{feeling.text}</p>
          <p className="feeling-meta">
            <span className="hashtag">#{feeling.hashtag}</span>
            {feeling.fromTheTeam && <FromTheTeamChip />}
          </p>
        </>
      ) : (
        <p className="muted">Nothing here today.</p>
      )}
    </Card>
  );
}

export default async function Home() {
  const today = await (await getApp()).feelingsOfTheDay();
  const { ad, supportUrl } = commercialSettings();
  return (
    <>
      <main className="first-screen">
        <h1 className="today">
          How Singapore is feeling <time dateTime={today.cycle}>{formatCycle(today.cycle)}</time>
        </h1>
        <Feeling polarity="good" feeling={today.good} />
        <Feeling polarity="bad" feeling={today.bad} />
        {/* The ad sits below both Feelings, never between or above them. */}
        {ad && <AdSlot ad={ad} />}
      </main>
      {supportUrl && (
        <footer className="site-footer">
          <a href={supportUrl} target="_blank" rel="noopener noreferrer">
            Support Yah Lah
          </a>
          <p className="caption muted">Chip in to help keep Yah Lah running. This is support for the site, not a charity donation.</p>
        </footer>
      )}
    </>
  );
}
