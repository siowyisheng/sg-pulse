import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { MyFeeling } from "@/core/app";
import { bylineText } from "@/core/byline";
import { isDemoMode } from "@/demo-flag";
import { BylineChip, PolarityBadge, QueuedForTomorrowChip, StateChip, UnderReviewChip, YourYahLahChip } from "@/ui/badges";
import { Button } from "@/ui/buttons";
import { Card } from "@/ui/card";
import { formatCycle, formatMoment } from "@/web/format";
import { feedbackIsOn } from "@/web/feedback";
import { currentMe } from "@/web/session";
import { signOutAction } from "../auth-actions";
import { becomeAdminInDemoAction } from "../demo/actions";
import { undoUpvoteFromMyFeelingsAction } from "../feelings/actions";
import { requestRemovalAction } from "./actions";
import { Emoji, HashtagLabel } from "@/ui/emoji";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My Feelings" };

function State({ feeling }: { feeling: MyFeeling }) {
  switch (feeling.state) {
    case "queued":
      return <QueuedForTomorrowChip />;
    case "candidate":
      return <StateChip emoji="🗳️">Candidate today</StateChip>;
    case "winner":
      return <StateChip emoji="🏆">Feeling of the Day</StateChip>;
    case "under-review":
      return <UnderReviewChip />;
    case "removed":
      return <StateChip emoji="🚫">Removed by an Admin</StateChip>;
    case "expired":
      return <StateChip emoji="💤">Expired</StateChip>;
  }
}

/** A User's own Feelings and where each stands. Only they see this. */
export default async function MyFeelings() {
  const me = await currentMe();
  if (!me) redirect("/sign-in");
  const [feelings, submission, upvote] = await Promise.all([me.myFeelings(), me.submission(), me.myUpvote()]);
  return (
    <main className="page">
      <h1>
        <Emoji char="🙋" />
        My Feelings
      </h1>
      <p className="feeling-meta">
        Your Byline <BylineChip>{bylineText(me.byline)}</BylineChip>
      </p>
      {submission.canSubmit && (
        <p>
          <a href="/submit">Write a Feeling{submission.queued ? " for tomorrow" : ""}</a>
        </p>
      )}
      {process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && (
        <p>
          <a href="/notifications">Daily notification</a>
        </p>
      )}
      {me.reportingTimedOutUntil && (
        <p className="notice" role="note">
          <span>
            You can&apos;t Report until {formatMoment(me.reportingTimedOutUntil)}, because a Feeling you Reported was found to be fine. Everything else works as usual.
          </span>
        </p>
      )}
      <h2>
        <Emoji char="🙌" />
        My Yah Lah today
      </h2>
      {upvote ? (
        <Card className="stack">
          <p className="feeling-meta">
            <PolarityBadge polarity={upvote.polarity} />
            <a className={`hashtag hashtag-${upvote.polarity}`} href={`/feelings/${upvote.polarity}/${encodeURIComponent(upvote.hashtag)}`}>
              <HashtagLabel hashtag={upvote.hashtag} />
            </a>
            <YourYahLahChip />
          </p>
          <p>{upvote.text}</p>
          <form action={undoUpvoteFromMyFeelingsAction}>
            <Button variant="ghost" type="submit">
              Take it back
            </Button>
          </form>
        </Card>
      ) : (
        <p className="muted">
          You haven&apos;t said Yah Lah to a Feeling today. <a href="/#voting">Browse today&apos;s Feelings</a>
        </p>
      )}
      <h2>
        <Emoji char="✍️" />
        Feelings I wrote
      </h2>
      {feelings.length === 0 && <p className="muted">You haven&apos;t written a Feeling yet.</p>}
      {feelings.map((feeling) => (
        <Card key={feeling.cycle} className="stack">
          <p className="feeling-meta">
            <PolarityBadge polarity={feeling.polarity} />
            <time className="caption muted" dateTime={feeling.cycle}>
              {formatCycle(feeling.cycle)}
            </time>
            <State feeling={feeling} />
          </p>
          <p>{feeling.text}</p>
          <p className={`hashtag hashtag-${feeling.polarity}`}>
            <HashtagLabel hashtag={feeling.hashtag} />
          </p>
          {feeling.state === "winner" &&
            (feeling.removalRequested ? (
              <p className="caption muted">You&apos;ve asked for this to be removed. It will be, within 24 hours.</p>
            ) : (
              <form action={requestRemovalAction.bind(null, feeling.id)}>
                <Button variant="ghost" type="submit">
                  Ask for removal
                </Button>
              </form>
            ))}
        </Card>
      ))}
      <form className="actions" action={signOutAction}>
        <Button variant="ghost" type="submit">
          Log out
        </Button>
        {isDemoMode() && !me.isAdmin && (
          <Button variant="ghost" type="submit" formAction={becomeAdminInDemoAction}>
            Demo: make me an Admin
          </Button>
        )}
      </form>
      <p>
        <a href="/me/delete">Delete my account</a>
      </p>
      {feedbackIsOn() && (
        <p>
          <a className="quiet-link" href="/feedback?from=/me">
            Feedback
          </a>
        </p>
      )}
    </main>
  );
}
