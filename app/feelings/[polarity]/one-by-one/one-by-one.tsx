"use client";

import { CircleAlert, SkipForward } from "lucide-react";
import { useState, useTransition } from "react";
import type { Polarity } from "@/core/feeling-rules";
import { bylineText } from "@/core/byline";
import { BylineChip, StandingChip, StateChip, YourYahLahChip } from "@/ui/badges";
import { Button } from "@/ui/buttons";
import { Card } from "@/ui/card";
import { Emoji, HashtagLabel } from "@/ui/emoji";
import { LoginButton } from "@/ui/login-gate";
import { startSingpassAction } from "../../../auth-actions";
import { undoUpvoteAction, upvoteAction } from "../../actions";
import type { ShownCandidate } from "../[hashtag]/candidate-list";

/**
 * Today's Candidates of one Polarity, one at a time. Yah Lah gives (or moves) the User's one Upvote
 * and goes on to the next; Skip just goes on. The order is kept as it first arrived.
 */
export function OneByOne({
  polarity,
  candidates,
  viewer,
  upvoteIsElsewhere,
}: {
  polarity: Polarity;
  candidates: ShownCandidate[];
  viewer: "user" | "visitor" | "visitor-no-login";
  upvoteIsElsewhere: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [upvotedId, setUpvotedId] = useState(candidates.find((candidate) => candidate.hasMyUpvote)?.id);
  const [elsewhere, setElsewhere] = useState(upvoteIsElsewhere);
  const [problem, setProblem] = useState<string>();
  /** The Feeling just given the Yah Lah, so moving on still shows that it worked. */
  const [given, setGiven] = useState<string>();
  const [busy, startTransition] = useTransition();
  const current = candidates[index];

  const next = () => {
    setProblem(undefined);
    setGiven(undefined);
    setIndex((at) => at + 1);
  };

  function yahLah(feelingId: string) {
    startTransition(async () => {
      const { message } = await upvoteAction(feelingId);
      if (message) return setProblem(message);
      setUpvotedId(feelingId);
      setElsewhere(false);
      next();
      setGiven(candidates.find((candidate) => candidate.id === feelingId)?.text);
    });
  }

  function takeBack() {
    startTransition(async () => {
      const { message } = await undoUpvoteAction();
      if (message) return setProblem(message);
      setUpvotedId(undefined);
    });
  }

  if (candidates.length === 0) {
    return (
      <Card className="stack">
        <p>No Feelings to go through yet today.</p>
        <a href="/submit">Write the first one</a>
      </Card>
    );
  }

  if (!current) {
    return (
      <Card className="stack">
        <p>
          <Emoji char="🎉" />
          You&apos;ve seen them all.
        </p>
        {upvotedId && <p className="caption muted">Your Yah Lah for today is given. You can move it or take it back on My Feelings until midnight.</p>}
        <div className="actions">
          <a className="button button-ghost" href={`/feelings/${polarity}`}>
            Back to the Hashtags
          </a>
          <Button variant="ghost" onClick={() => setIndex(0)}>
            Start again
          </Button>
        </div>
      </Card>
    );
  }

  const holdsMyYahLah = current.id === upvotedId;
  return (
    <>
      <p className="caption muted" aria-live="polite">
        {index + 1} of {candidates.length}
      </p>
      {given && (
        <p className="notice" role="status">
          <Emoji char="🙌" />
          <span>
            Your Yah Lah is on &ldquo;{given}&rdquo;. You can move it or take it back until midnight.
          </span>
        </p>
      )}
      <Card as="article" className={`stack wide one-by-one feeling-${polarity} edged`} aria-label={`Feeling ${index + 1} of ${candidates.length}`}>
        <p className="feeling-text">{current.text}</p>
        <p className="feeling-meta">
          <a className={`hashtag hashtag-${polarity}`} href={`/feelings/${polarity}/${encodeURIComponent(current.hashtag)}`}>
            <HashtagLabel hashtag={current.hashtag} />
          </a>
          <BylineChip>{bylineText(current.byline)}</BylineChip>
          {current.standing && <StandingChip standing={current.standing} />}
          {current.mine && <StateChip>Yours</StateChip>}
          {holdsMyYahLah && <YourYahLahChip />}
        </p>
        {problem && (
          <p className="problem" role="alert">
            <CircleAlert aria-hidden="true" size={18} /> {problem}
          </p>
        )}
        <div className="one-by-one-actions">
          {current.mine ? (
            <p className="muted">This is your own Feeling, so you can&apos;t Yah Lah it.</p>
          ) : viewer === "user" && holdsMyYahLah ? (
            <Button variant="ghost" onClick={takeBack} disabled={busy}>
              Take it back
            </Button>
          ) : viewer === "user" ? (
            <Button variant="yah-lah" className="button-large" onClick={() => yahLah(current.id)} disabled={busy}>
              <Emoji char="🙌" />
              Yah Lah
            </Button>
          ) : viewer === "visitor" ? (
            <LoginButton action={startSingpassAction} variant="yah-lah" large>
              Yah Lah
            </LoginButton>
          ) : null}
          <Button variant="ghost" className="wide" onClick={next} disabled={busy}>
            <SkipForward aria-hidden="true" size={18} /> {holdsMyYahLah || current.mine ? "Next" : "Skip"}
          </Button>
        </div>
        {viewer === "user" && !current.mine && !holdsMyYahLah && (
          <p className="caption muted">{upvotedId || elsewhere ? "You have one Yah Lah a day. This moves it here from the Feeling you chose earlier." : "You have one Yah Lah a day. You can move it or take it back until midnight."}</p>
        )}
        {viewer === "visitor" && <p className="caption muted">You&apos;ll log in with Singpass first, so one person has one Yah Lah a day.</p>}
      </Card>
    </>
  );
}
