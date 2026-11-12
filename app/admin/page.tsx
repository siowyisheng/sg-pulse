import { CircleAlert } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ApprovalChoice } from "@/core/app";
import { bylineText } from "@/core/byline";
import { nextCycle } from "@/core/cycle";
import type { Polarity } from "@/core/feeling-rules";
import { getApp } from "@/composition";
import { BylineChip, FromTheTeamChip, PolarityBadge, StateChip, UnderReviewChip } from "@/ui/badges";
import { Button } from "@/ui/buttons";
import { Card } from "@/ui/card";
import { formatCycle, yahLahs } from "@/web/format";
import { POLARITY_LABEL } from "@/web/polarity";
import { currentMe } from "@/web/session";
import { approveAction, unscheduleSeedFeelingAction, withdrawApprovalAction } from "./actions";
import { SeedForm } from "./seed-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin · Yah Lah", robots: { index: false } };

/** The Admin area. To anyone else it does not exist. */
function Choices({ polarity, choices, approvedId, goesLive }: { polarity: Polarity; choices: ApprovalChoice[]; approvedId: string | null; goesLive: string }) {
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
            <span className={`hashtag hashtag-${polarity}`}>#{choice.hashtag}</span>
            <BylineChip>{bylineText(choice.byline)}</BylineChip>
            <span className="caption muted">{yahLahs(choice.yahLahs)} so far</span>
          </p>
          {choice.id === approvedId ? (
            <form className="feeling-meta" action={withdrawApprovalAction.bind(null, polarity)}>
              <StateChip>Approved for {formatCycle(goesLive)}</StateChip>
              <Button variant="ghost" type="submit">
                Withdraw
              </Button>
            </form>
          ) : (
            <form action={approveAction.bind(null, choice.id)}>
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

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ problem?: string | string[] }> }) {
  const me = await currentMe();
  if (!me?.isAdmin) notFound();
  const approval = await me.asAdmin().approvalChoices();
  const missed = (await searchParams).problem === "NOT_A_CHOICE";
  const today = (await getApp()).currentCycle();
  const scheduled = await me.asAdmin().scheduledSeedFeelings();
  return (
    <main className="page">
      <h1>Admin</h1>
      <section className="stack">
        <h2>Approve the Feelings for {formatCycle(approval.goesLive)}</h2>
        <p className="muted">
          Pick one of each before midnight. They go live at 00:00 with their final counts; until then you can change your mind. With no Approval, today&apos;s Feeling stays up
          as &ldquo;still feeling it&rdquo;.
        </p>
        {missed && (
          <p className="problem" role="alert">
            <CircleAlert aria-hidden="true" size={18} /> That Feeling is no longer one of the top three. These are the current ones.
          </p>
        )}
        <Choices polarity="good" goesLive={approval.goesLive} {...approval.good} />
        <Choices polarity="bad" goesLive={approval.goesLive} {...approval.bad} />
      </section>
      <Card as="section" className="stack">
        <h2>New Seed Feeling</h2>
        <p className="muted">Written by the team, in your own words: never copied from anywhere. It shows as &ldquo;From the team&rdquo;, with no Byline.</p>
        <SeedForm firstCycle={today} defaultCycle={nextCycle(today)} />
      </Card>
      <section className="stack">
        <h2>Scheduled</h2>
        {scheduled.length === 0 && <p className="muted">Nothing is scheduled from today on.</p>}
        {scheduled.map((seed) => (
          <Card key={`${seed.cycle}-${seed.polarity}`} className="stack wide">
            <p className="feeling-meta">
              <PolarityBadge polarity={seed.polarity} />
              <strong>
                <time dateTime={seed.cycle}>{formatCycle(seed.cycle)}</time>
              </strong>
              {seed.live && <StateChip>Live today</StateChip>}
            </p>
            <p>{seed.text}</p>
            <p className="feeling-meta">
              <span className={`hashtag hashtag-${seed.polarity}`}>#{seed.hashtag}</span>
              <FromTheTeamChip />
            </p>
            {!seed.live && (
              <form action={unscheduleSeedFeelingAction.bind(null, seed.cycle, seed.polarity)}>
                <Button variant="ghost" type="submit">
                  Take back
                </Button>
              </form>
            )}
          </Card>
        ))}
      </section>
    </main>
  );
}
