"use client";

import { CircleAlert } from "lucide-react";
import { useState, useTransition } from "react";
import type { Candidate } from "@/core/app";
import { bylineText } from "@/core/byline";
import { BylineChip, StateChip, YourYahLahChip } from "@/ui/badges";
import { Button } from "@/ui/buttons";
import { LoginButton } from "@/ui/login-gate";
import { Modal } from "@/ui/modal";
import { startSingpassAction } from "../../../auth-actions";
import { undoUpvoteAction, upvoteAction } from "../../actions";

export type ShownCandidate = Candidate & { mine?: boolean; hasMyUpvote?: boolean };

/**
 * The Candidates under a Hashtag. Tapping one brings up a large Yah Lah button. The list is kept as
 * it first arrived: saying Yah Lah marks a Candidate in place, without drawing a new jumble.
 */
export function CandidateList({ candidates, viewer, upvoteIsElsewhere }: { candidates: ShownCandidate[]; viewer: "user" | "visitor" | "visitor-no-login"; upvoteIsElsewhere: boolean }) {
  const [upvotedId, setUpvotedId] = useState(candidates.find((candidate) => candidate.hasMyUpvote)?.id);
  /** The User's Upvote sits on a Candidate that this jumble doesn't show. */
  const [upvoteElsewhere, setUpvoteElsewhere] = useState(upvoteIsElsewhere);
  const [openId, setOpenId] = useState<string>();
  const [problem, setProblem] = useState<string>();
  const [busy, startTransition] = useTransition();
  const open = candidates.find((candidate) => candidate.id === openId);

  const close = () => {
    setOpenId(undefined);
    setProblem(undefined);
  };

  function yahLah(feelingId: string) {
    startTransition(async () => {
      const { message } = await upvoteAction(feelingId);
      if (message) return setProblem(message);
      setUpvotedId(feelingId);
      setUpvoteElsewhere(false);
      close();
    });
  }

  function undo() {
    startTransition(async () => {
      const { message } = await undoUpvoteAction();
      if (message) return setProblem(message);
      setUpvotedId(undefined);
      close();
    });
  }

  return (
    <>
      {candidates.map((candidate) => (
        <button key={candidate.id} type="button" className="card candidate" onClick={() => setOpenId(candidate.id)}>
          <span className="candidate-text">{candidate.text}</span>
          <span className="feeling-meta">
            <BylineChip>{bylineText(candidate.byline)}</BylineChip>
            {candidate.mine && <StateChip>Yours</StateChip>}
            {candidate.id === upvotedId && <YourYahLahChip />}
          </span>
        </button>
      ))}
      <Modal open={open !== undefined} onClose={close} title={open ? `#${open.hashtag}` : ""}>
        {open && (
          <div className="stack">
            <p className="candidate-text">{open.text}</p>
            <BylineChip>{bylineText(open.byline)}</BylineChip>
            {problem && (
              <p className="problem" role="alert">
                <CircleAlert aria-hidden="true" size={18} /> {problem}
              </p>
            )}
            {open.mine ? (
              <p className="muted">This is your own Feeling, so you can&apos;t Yah Lah it.</p>
            ) : viewer === "user" && open.id === upvotedId ? (
              <>
                <YourYahLahChip />
                <Button variant="ghost" onClick={undo} disabled={busy}>
                  Take it back
                </Button>
              </>
            ) : viewer === "user" ? (
              <>
                <Button variant="yah-lah" className="button-large" onClick={() => yahLah(open.id)} disabled={busy}>
                  Yah Lah
                </Button>
                <p className="caption muted">
                  {upvotedId || upvoteElsewhere ? "You have one Yah Lah a day. This moves it here from the Feeling you chose earlier." : "You have one Yah Lah a day. You can move it or take it back until midnight."}
                </p>
              </>
            ) : viewer === "visitor" ? (
              <>
                <LoginButton action={startSingpassAction} variant="yah-lah" large>
                  Yah Lah
                </LoginButton>
                <p className="caption muted">You&apos;ll log in with Singpass first, so one person has one Yah Lah a day.</p>
              </>
            ) : (
              <p className="muted">Saying Yah Lah isn&apos;t open yet.</p>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
