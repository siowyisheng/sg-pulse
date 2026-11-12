import { Frown, Smile } from "lucide-react";
import type { FeelingOfTheDay } from "@/core/app";
import type { Polarity } from "@/core/feeling-rules";
import { getApp } from "@/composition";
import { formatCycle } from "@/web/format";

// The Cycle comes from the time of each request, so this page is never built ahead of time.
export const dynamic = "force-dynamic";

const POLARITY = {
  good: { label: "Good", Icon: Smile },
  bad: { label: "Bad", Icon: Frown },
} as const;

function Feeling({ polarity, feeling }: { polarity: Polarity; feeling: FeelingOfTheDay | null }) {
  const { label, Icon } = POLARITY[polarity];
  return (
    <article className={`feeling ${polarity}`} aria-labelledby={`${polarity}-title`}>
      <h2 id={`${polarity}-title`} className="polarity">
        <Icon aria-hidden="true" size={20} /> {label} Feeling of the Day
      </h2>
      {feeling ? (
        <>
          <p className="feeling-text">{feeling.text}</p>
          <p className="feeling-meta">
            <span className="hashtag">#{feeling.hashtag}</span>
            {feeling.fromTheTeam && <span className="chip">From the team</span>}
          </p>
        </>
      ) : (
        <p className="feeling-empty">No {label} Feeling today.</p>
      )}
    </article>
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
