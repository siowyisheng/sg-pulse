import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { nextCycle } from "@/core/cycle";
import { getApp } from "@/composition";
import { FromTheTeamChip, PolarityBadge, StateChip } from "@/ui/badges";
import { Button } from "@/ui/buttons";
import { Card } from "@/ui/card";
import { formatCycle } from "@/web/format";
import { currentMe } from "@/web/session";
import { unscheduleSeedFeelingAction } from "./actions";
import { SeedForm } from "./seed-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin · Yah Lah", robots: { index: false } };

/** The Admin area. To anyone else it does not exist. */
export default async function AdminPage() {
  const me = await currentMe();
  if (!me?.isAdmin) notFound();
  const today = (await getApp()).currentCycle();
  const scheduled = await me.asAdmin().scheduledSeedFeelings();
  return (
    <main className="page">
      <h1>Admin</h1>
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
