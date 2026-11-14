import { ChevronLeft, Shuffle } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getApp } from "@/composition";
import { CANDIDATES_SHOWN } from "@/core/feelings";
import { PolarityBadge } from "@/ui/badges";
import { Card } from "@/ui/card";
import { formatMoment } from "@/web/format";
import { decoded, POLARITY_LABEL, polarityFrom } from "@/web/polarity";
import { currentMe } from "@/web/session";
import { isSingpassConnected } from "@/web/singpass";
import { CandidateList, type ShownCandidate } from "./candidate-list";
import { HashtagLabel } from "@/ui/emoji";

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
  const me = await currentMe();
  const candidates: ShownCandidate[] = me ? await me.candidates({ polarity, hashtag }) : await (await getApp()).candidates({ polarity, hashtag });
  const myUpvote = me ? await me.myUpvote() : null;
  const upvoteIsElsewhere = myUpvote !== null && !candidates.some((candidate) => candidate.hasMyUpvote);
  const viewer = me ? "user" : isSingpassConnected() ? "visitor" : "visitor-no-login";
  return (
    <main className="page">
      <a className="back-link" href={`/feelings/${polarity}`}>
        <ChevronLeft aria-hidden="true" size={20} /> {POLARITY_LABEL[polarity]} Hashtags
      </a>
      <h1 className="page-title">
        <PolarityBadge polarity={polarity} /> <span className={`hashtag-${polarity}`}>
          <HashtagLabel hashtag={hashtag.replace(/^#+/, "").toLowerCase()} />
        </span>
      </h1>
      {candidates.length === 0 && (
        <Card className="stack">
          <p>No Feelings under this Hashtag right now.</p>
          <a href="/submit">Write one</a>
        </Card>
      )}
      {/* Keyed by what it shows, so "Show another mix" starts it afresh. */}
      <CandidateList key={candidates.map((candidate) => candidate.id).join()} candidates={candidates} viewer={viewer} upvoteIsElsewhere={upvoteIsElsewhere}
        isAdmin={me?.isAdmin ?? false}
        {...(me?.reportingTimedOutUntil ? { reportingOffUntil: formatMoment(me.reportingTimedOutUntil) } : {})}
      />
      {upvoteIsElsewhere && (
        <p className="caption muted">
          Your Yah Lah today is on another Feeling: <a href="/me">see it</a>.
        </p>
      )}
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
