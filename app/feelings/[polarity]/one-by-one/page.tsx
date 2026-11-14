import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getApp } from "@/composition";
import { PolarityBadge } from "@/ui/badges";
import { Emoji } from "@/ui/emoji";
import { POLARITY_LABEL, polarityFrom } from "@/web/polarity";
import { currentMe } from "@/web/session";
import { isSingpassConnected } from "@/web/singpass";
import type { ShownCandidate } from "../[hashtag]/candidate-list";
import { OneByOne } from "./one-by-one";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ polarity: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const polarity = polarityFrom((await params).polarity);
  return polarity ? { title: `${POLARITY_LABEL[polarity]} Feelings one by one` } : {};
}

/** Today's Candidates of one Polarity, from every Hashtag, one at a time: Yah Lah or skip. Open to everyone. */
export default async function OneByOnePage({ params }: Props) {
  const polarity = polarityFrom((await params).polarity);
  if (!polarity) notFound();
  const me = await currentMe();
  const candidates: ShownCandidate[] = me ? await me.oneByOne(polarity) : await (await getApp()).oneByOne(polarity);
  const upvoteIsElsewhere = me ? (await me.myUpvote()) !== null && !candidates.some((candidate) => candidate.hasMyUpvote) : false;
  return (
    <main className="page">
      <a className="back-link" href={`/feelings/${polarity}`}>
        <ChevronLeft aria-hidden="true" size={20} /> {POLARITY_LABEL[polarity]} Hashtags
      </a>
      <h1 className="page-title">
        <PolarityBadge polarity={polarity} /> <Emoji char="👉" />
        One by one
      </h1>
      <OneByOne
        polarity={polarity}
        candidates={candidates}
        viewer={me ? "user" : isSingpassConnected() ? "visitor" : "visitor-no-login"}
        upvoteIsElsewhere={upvoteIsElsewhere}
      />
    </main>
  );
}
