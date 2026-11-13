import { Megaphone } from "lucide-react";
import type { ReactNode } from "react";
import type { PublishedFeeling } from "@/core/app";
import { bylineText } from "@/core/byline";
import { yahLahs } from "@/web/format";
import { sharePath } from "@/web/site";
import { BylineChip, FromTheTeamChip, StillFeelingItChip } from "./badges";
import { ShareButton } from "./share-button";

/**
 * The inside of a card for a Feeling that is or was a Feeling of the Day: its text, Hashtag, who
 * it is from, its final count, any correction notice, and a share button. `size` is "large" on the
 * front page.
 */
export function PublishedFeelingBody({ feeling, carriedOver = false, size = "regular", children }: { feeling: PublishedFeeling; carriedOver?: boolean; size?: "large" | "regular"; children?: ReactNode }) {
  return (
    <>
      {/* The inner span lets a front page look style each line of the text, as a highlighter stroke. */}
      <p className={size === "large" ? "feeling-text" : "candidate-text"}>{size === "large" ? <span className="feeling-text-line">{feeling.text}</span> : feeling.text}</p>
      {feeling.correctionNotice && (
        <p className="notice" role="note">
          <Megaphone aria-hidden="true" size={18} />
          <span>
            <strong>Correction notice.</strong> {feeling.correctionNotice}
          </span>
        </p>
      )}
      <p className="feeling-meta">
        <span className={`hashtag hashtag-${feeling.polarity}`}>#{feeling.hashtag}</span>
        {feeling.fromTheTeam && <FromTheTeamChip />}
        {feeling.byline && <BylineChip>{bylineText(feeling.byline)}</BylineChip>}
        {carriedOver && <StillFeelingItChip />}
      </p>
      <p className="feeling-meta spread">
        <span className="caption muted">{feeling.yahLahs !== null && yahLahs(feeling.yahLahs)}</span>
        <ShareButton path={sharePath(feeling)} text={`${feeling.text} #${feeling.hashtag}`} />
      </p>
      {children}
    </>
  );
}
