import { CircleAlert } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { APP_NAMES, DESIGNS, FRONT_PAGE_LOOKS, type ApprovalChoice } from "@/core/app";
import { bylineText } from "@/core/byline";
import { nextCycle } from "@/core/cycle";
import type { Polarity } from "@/core/feeling-rules";
import { getApp } from "@/composition";
import { BylineChip, FromTheTeamChip, PolarityBadge, StateChip, UnderReviewChip } from "@/ui/badges";
import { Button } from "@/ui/buttons";
import { Card } from "@/ui/card";
import { DESIGN_DESCRIPTIONS } from "@/ui/design-descriptions";
import { Emoji } from "@/ui/emoji";
import { LOOK_DESCRIPTIONS } from "@/ui/front-page-looks";
import { formatCycle, formatMoment, yahLahs } from "@/web/format";
import { APP_NAME_TEXT } from "@/web/app-name";
import { POLARITY_LABEL } from "@/web/polarity";
import { currentMe } from "@/web/session";
import { approveAction, clearReportAction, setAppNameAction, setDesignAction, setFrontPageLookAction, takeDownAction, unscheduleSeedFeelingAction, withdrawApprovalAction } from "./actions";
import { NoticeForm } from "./notice-form";
import { SeedForm } from "./seed-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin", robots: { index: false } };

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
  const [approval, reports, removals, live] = await Promise.all([me.asAdmin().approvalChoices(), me.asAdmin().reports(), me.asAdmin().removalRequests(), (await getApp()).feelingsOfTheDay()]);
  const showing = [live.good, live.bad].filter((feeling) => feeling !== null);
  const missed = (await searchParams).problem === "NOT_A_CHOICE";
  const today = (await getApp()).currentCycle();
  const [scheduled, look, design, appName] = await Promise.all([
    me.asAdmin().scheduledSeedFeelings(),
    (await getApp()).frontPageLook(),
    (await getApp()).design(),
    (await getApp()).appName(),
  ]);
  return (
    <main className="page">
      <h1>Admin</h1>
      <section className="stack">
        <h2>Removal requests</h2>
        {removals.length === 0 && <p className="muted">Nobody is waiting for a Feeling to be removed.</p>}
        {removals.map((request) => (
          <Card key={request.feelingId} className="stack wide">
            <p className="feeling-meta">
              <PolarityBadge polarity={request.polarity} />
              <span className="caption muted">
                Asked {formatMoment(request.requestedAt)} · due by {formatMoment(request.dueBy)} · published {formatCycle(request.cycle)}
              </span>
            </p>
            <p className="candidate-text">{request.text}</p>
            <p className="feeling-meta">
              <span className={`hashtag hashtag-${request.polarity}`}>#{request.hashtag}</span>
              {request.byline && <BylineChip>{bylineText(request.byline)}</BylineChip>}
            </p>
            <form action={takeDownAction.bind(null, request.feelingId)}>
              <Button variant="secondary" type="submit">
                Remove it
              </Button>
            </form>
          </Card>
        ))}
      </section>
      <section className="stack">
        <h2>Reports</h2>
        {reports.length === 0 && <p className="muted">No Feeling is waiting on you.</p>}
        {reports.map((report) => (
          <Card key={report.feelingId} className="stack wide">
            <p className="feeling-meta">
              <PolarityBadge polarity={report.polarity} />
              <span className="caption muted">
                Reported {formatMoment(report.reportedAt)} · competing on {formatCycle(report.cycle)}
              </span>
            </p>
            <p className="candidate-text">{report.text}</p>
            <p className="feeling-meta">
              <span className={`hashtag hashtag-${report.polarity}`}>#{report.hashtag}</span>
              <BylineChip>{bylineText(report.byline)}</BylineChip>
              <span className="caption muted">{yahLahs(report.yahLahs)}</span>
            </p>
            <form className="actions">
              <Button variant="secondary" type="submit" formAction={clearReportAction.bind(null, report.feelingId, 7)}>
                It&apos;s fine: put it back
              </Button>
              <Button variant="ghost" type="submit" formAction={takeDownAction.bind(null, report.feelingId)}>
                Remove it
              </Button>
              <Button variant="ghost" type="submit" formAction={clearReportAction.bind(null, report.feelingId, 0)}>
                Put it back, no Timeout
              </Button>
            </form>
            <p className="caption muted">Putting it back gives the person who Reported it a one-week Timeout from Reporting, unless you choose no Timeout.</p>
          </Card>
        ))}
      </section>
      <section className="stack">
        <h2>Showing now</h2>
        {showing.length === 0 && <p className="muted">No Feeling of the Day is showing.</p>}
        {showing.map((feeling) => (
          <Card key={feeling.id} className="stack wide">
            <p className="feeling-meta">
              <PolarityBadge polarity={feeling.polarity} />
              <span className="caption muted">
                Since {formatCycle(feeling.cycle)}
                {feeling.yahLahs !== null && ` · ${yahLahs(feeling.yahLahs)}`}
              </span>
            </p>
            <p className="candidate-text">{feeling.text}</p>
            <NoticeForm feelingId={feeling.id} notice={feeling.correctionNotice} />
            <form action={takeDownAction.bind(null, feeling.id)}>
              <Button variant="ghost" type="submit">
                Take down now
              </Button>
            </form>
            <p className="caption muted">Taking it down is immediate and can&apos;t be undone. The next most-upvoted Feeling of its day takes its place, or else the one before it carries over.</p>
          </Card>
        ))}
      </section>
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
        <h2>App name</h2>
        <p className="muted">
          What the site calls itself on its screens and in browser tabs, for everyone, at once. The button for an Upvote still says &ldquo;Yah Lah&rdquo; whichever name you pick.
        </p>
        <Card className="stack wide">
          {APP_NAMES.map((option) => (
            <div key={option} className="feeling-meta spread">
              <strong>{APP_NAME_TEXT[option]}</strong>
              {option === appName ? (
                <StateChip>Showing now</StateChip>
              ) : (
                <form action={setAppNameAction.bind(null, option)}>
                  <Button variant="ghost" type="submit">
                    Use this name
                  </Button>
                </form>
              )}
            </div>
          ))}
        </Card>
      </section>
      <section className="stack">
        <h2>Design</h2>
        <p className="muted">
          The look of every screen Visitors and Users see: colours, type, shapes and emojis. The screens and words stay the same. Preview a Design to browse the whole site in it
          (only you see it), then switch everyone at once; you can switch back at any time.
        </p>
        {DESIGNS.map((option) => (
          <Card key={option} className="stack wide">
            <h3 className="feeling-meta">
              <Emoji char={DESIGN_DESCRIPTIONS[option].emoji} />
              {DESIGN_DESCRIPTIONS[option].name}
              {option === design && <StateChip>Showing now</StateChip>}
            </h3>
            <p className="muted">{DESIGN_DESCRIPTIONS[option].description}</p>
            <div className="actions">
              <a className="button button-ghost" href={option === design ? "/design-preview?stop" : `/design-preview?design=${option}`}>
                {option === design ? "See it" : "Preview"}
              </a>
              {option !== design && (
                <form action={setDesignAction.bind(null, option)}>
                  <Button variant="secondary" type="submit">
                    Use this Design
                  </Button>
                </form>
              )}
            </div>
          </Card>
        ))}
      </section>
      <section className="stack">
        <h2>Front page look</h2>
        <p className="muted">How the first screen of the front page is laid out, for everyone, in the Classic Design (the others bring their own). Preview a look before you switch; switching is immediate and you can switch back at any time.</p>
        {FRONT_PAGE_LOOKS.map((option) => (
          <Card key={option} className="stack wide">
            <h3 className="feeling-meta">
              {LOOK_DESCRIPTIONS[option].name}
              {option === look && <StateChip>Showing now</StateChip>}
            </h3>
            <p className="muted">{LOOK_DESCRIPTIONS[option].description}</p>
            <div className="actions">
              <a className="button button-ghost" href={`/?look=${option}`} target="_blank" rel="noopener">
                Preview
              </a>
              {option !== look && (
                <form action={setFrontPageLookAction.bind(null, option)}>
                  <Button variant="secondary" type="submit">
                    Use this look
                  </Button>
                </form>
              )}
            </div>
          </Card>
        ))}
      </section>
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
