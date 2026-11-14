import type { ApprovalChoice } from "@/core/app";
import { bylineText } from "@/core/byline";
import type { Polarity } from "@/core/feeling-rules";
import { BylineChip, PolarityBadge, StateChip, UnderReviewChip } from "@/ui/badges";
import { Button } from "@/ui/buttons";
import { Card } from "@/ui/card";
import { HashtagLabel } from "@/ui/emoji";
import { formatCycle, yahLahs } from "@/web/format";
import { POLARITY_LABEL } from "@/web/polarity";
import { approveAction, withdrawApprovalAction } from "./actions";

/** The top three of a Polarity for tomorrow, each to approve with one tap. `back` is the page to show again afterwards. */
export function Choices({ polarity, choices, approvedId, goesLive, back }: { polarity: Polarity; choices: ApprovalChoice[]; approvedId: string | null; goesLive: string; back: "/admin" | "/admin/approve" }) {
  return (
    <section className="stack wide" aria-label={`${POLARITY_LABEL[polarity]} Feeling`}>
      <h3 className="feeling-meta">
        <PolarityBadge polarity={polarity} /> Top three
        {approvedId === null && choices.length > 0 && <UnderReviewChip label="Not approved yet" />}
      </h3>
      {choices.length === 0 && <p className="muted">No {POLARITY_LABEL[polarity]} Candidates today, so there is nothing to approve. Today&apos;s Feeling will carry over.</p>}
      {choices.map((choice) => (
        <Card key={choice.id} className="stack wide">
          <p className="candidate-text">{choice.text}</p>
          <p className="feeling-meta">
            <span className={`hashtag hashtag-${polarity}`}>
              <HashtagLabel hashtag={choice.hashtag} />
            </span>
            <BylineChip>{bylineText(choice.byline)}</BylineChip>
            <span className="caption muted">{yahLahs(choice.yahLahs)} so far</span>
          </p>
          {choice.id === approvedId ? (
            <form className="feeling-meta" action={withdrawApprovalAction.bind(null, polarity, back)}>
              <StateChip>Approved for {formatCycle(goesLive)}</StateChip>
              <Button variant="ghost" type="submit">
                Withdraw
              </Button>
            </form>
          ) : (
            <form action={approveAction.bind(null, choice.id, back)}>
              <Button variant="secondary" type="submit">
                {approvedId ? "Approve this one instead" : "Approve"}
              </Button>
            </form>
          )}
        </Card>
      ))}
    </section>
  );
}
