import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import { getApp } from "@/composition";
import { PolarityBadge } from "@/ui/badges";
import { Card } from "@/ui/card";
import { PublishedFeelingBody } from "@/ui/published-feeling";
import { formatCycle } from "@/web/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Earlier days · Yah Lah" };

/** Past Feelings of the Day, newest first. Open to everyone. */
export default async function Archive({ searchParams }: { searchParams: Promise<{ before?: string | string[] }> }) {
  const { before } = await searchParams;
  const entries = await (await getApp()).archive(typeof before === "string" ? { before } : {});
  const days = [...new Set(entries.map((entry) => entry.cycle))];
  return (
    <main className="page">
      <a className="back-link" href="/">
        <ChevronLeft aria-hidden="true" size={20} /> Today
      </a>
      <h1 className="page-title">Earlier days</h1>
      {entries.length === 0 && <p className="muted">{before ? "Nothing earlier than this." : "Nothing yet. Come back tomorrow."}</p>}
      {days.map((day) => (
        <section key={day} className="stack wide" aria-label={formatCycle(day)}>
          <h2 className="day-heading">
            <time dateTime={day}>{formatCycle(day)}</time>
          </h2>
          {entries
            .filter((entry) => entry.cycle === day)
            .map((entry) => (
              <Card key={entry.id} as="article" className={`stack wide feeling-${entry.polarity} edged`}>
                <PolarityBadge polarity={entry.polarity} />
                <PublishedFeelingBody feeling={entry} />
              </Card>
            ))}
        </section>
      ))}
      {days.length > 0 && (
        <a className="back-link" href={`/archive?before=${days.at(-1)}`}>
          Earlier still
        </a>
      )}
    </main>
  );
}
