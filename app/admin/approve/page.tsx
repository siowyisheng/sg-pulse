import { ChevronLeft, CircleAlert } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { formatCycle } from "@/web/format";
import { currentMe } from "@/web/session";
import { Choices } from "../choices";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Approve", robots: { index: false } };

/** Where the evening reminder leads: tomorrow's top three of each Polarity, and nothing else, to approve in one tap. Admins only. */
export default async function ApprovePage({ searchParams }: { searchParams: Promise<{ problem?: string | string[] }> }) {
  const me = await currentMe();
  if (!me?.isAdmin) notFound();
  const approval = await me.asAdmin().approvalChoices();
  const missed = (await searchParams).problem === "NOT_A_CHOICE";
  return (
    <main className="page">
      <a className="back-link" href="/admin">
        <ChevronLeft aria-hidden="true" size={20} /> Admin
      </a>
      <h1>Approve for {formatCycle(approval.goesLive)}</h1>
      <p className="muted">One of each before midnight; tap another to change your mind. With none, today&apos;s Feeling carries over.</p>
      {missed && (
        <p className="problem" role="alert">
          <CircleAlert aria-hidden="true" size={18} /> That Feeling is no longer one of the top three. These are the current ones.
        </p>
      )}
      <Choices polarity="good" goesLive={approval.goesLive} back="/admin/approve" {...approval.good} />
      <Choices polarity="bad" goesLive={approval.goesLive} back="/admin/approve" {...approval.bad} />
    </main>
  );
}
