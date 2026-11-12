import { Frown, Plus, Smile } from "lucide-react";
import type { FeelingOfTheDay } from "@/core/app";
import type { Polarity } from "@/core/feeling-rules";
import { getApp } from "@/composition";
import { AdSlot } from "@/ui/ad-slot";
import { PolarityBadge } from "@/ui/badges";
import { PublishedFeelingBody } from "@/ui/published-feeling";
import { Card } from "@/ui/card";
import { commercialSettings } from "@/web/commercial";
import { formatCycle } from "@/web/format";
import { currentMe } from "@/web/session";
import { isSingpassConnected } from "@/web/singpass";

// The Cycle comes from the time of each request, so this page is never built ahead of time.
export const dynamic = "force-dynamic";

function Feeling({ polarity, feeling }: { polarity: Polarity; feeling: FeelingOfTheDay | null }) {
  return (
    <Card as="article" className={`feeling feeling-${polarity}`} aria-labelledby={`${polarity}-title`}>
      <h2 id={`${polarity}-title`} className="feeling-title">
        <PolarityBadge polarity={polarity} /> Feeling of the Day
      </h2>
      {feeling ? (
        <PublishedFeelingBody feeling={feeling} carriedOver={feeling.carriedOver} size="large" />
      ) : (
        <p className="muted">Nothing here today.</p>
      )}
    </Card>
  );
}

export default async function Home() {
  const [today, me] = await Promise.all([(await getApp()).feelingsOfTheDay(), currentMe()]);
  const { ad, supportUrl } = commercialSettings();
  // Writing a Feeling needs a login; a Visitor is only asked for one when they tap the "+".
  const writeHref = me ? "/submit" : isSingpassConnected() ? "/sign-in" : null;
  return (
    <div className="snap-page">
      <main className="first-screen">
        <div className="feeling-meta spread">
          <h1 className="today">
            How Singapore is feeling <time dateTime={today.cycle}>{formatCycle(today.cycle)}</time>
          </h1>
          <a className="today" href="/archive">
            Earlier days
          </a>
        </div>
        <Feeling polarity="good" feeling={today.good} />
        <Feeling polarity="bad" feeling={today.bad} />
        {/* The ad sits below both Feelings, never between or above them. */}
        {ad && <AdSlot ad={ad} />}
      </main>
      <section id="voting" className="voting-screen" aria-labelledby="voting-title">
        <h2 id="voting-title" className="today">
          What will Singapore feel tomorrow? Pick a mood to see today&apos;s Feelings.
        </h2>
        <a className="mood mood-good" href="/feelings/good">
          <Smile aria-hidden="true" size={96} strokeWidth={1.5} />
          <span>Good</span>
        </a>
        <a className="mood mood-bad" href="/feelings/bad">
          <Frown aria-hidden="true" size={96} strokeWidth={1.5} />
          <span>Bad</span>
        </a>
        {writeHref && (
          <a className="write-button" href={writeHref} aria-label="Write a Feeling">
            <Plus aria-hidden="true" size={28} />
          </a>
        )}
      </section>
      {supportUrl && (
        <footer className="site-footer">
          <a href={supportUrl} target="_blank" rel="noopener noreferrer">
            Support Yah Lah
          </a>
          <p className="caption muted">Chip in to help keep Yah Lah running. This is support for the site, not a charity donation.</p>
        </footer>
      )}
    </div>
  );
}
