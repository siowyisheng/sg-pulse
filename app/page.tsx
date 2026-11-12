import type { FeelingOfTheDay } from "@/core/app";
import type { Polarity } from "@/core/feeling-rules";
import { getApp } from "@/composition";
import { FromTheTeamChip, PolarityBadge } from "@/ui/badges";
import { Card } from "@/ui/card";
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
  return (
    <main className="first-screen">
      <h1 className="today">
        How Singapore is feeling <time dateTime={today.cycle}>{formatCycle(today.cycle)}</time>
      </h1>
      <Feeling polarity="good" feeling={today.good} />
      <Feeling polarity="bad" feeling={today.bad} />
    </main>
  );
}
