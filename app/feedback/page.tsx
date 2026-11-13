import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Card } from "@/ui/card";
import { feedbackIsOn } from "@/web/feedback";
import { currentMe } from "@/web/session";
import { FeedbackForm } from "./feedback-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Feedback · Yah Lah", robots: { index: false } };

/** A problem or a suggestion for the owner, by email. For signed-in Users. `from` is the page the link was on. */
export default async function Feedback({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  if (!feedbackIsOn()) notFound();
  if (!(await currentMe())) redirect("/sign-in");
  const { from } = await searchParams;
  // Only a path on this site, so the link can't be used to put anything else in the email.
  const page = from && /^\/[A-Za-z0-9/_\-.]*$/.test(from) ? from : "";
  return (
    <main className="page">
      <h1>Feedback</h1>
      <Card className="stack">
        <p>Tell us about a problem, or a suggestion. It goes to the person who runs Yah Lah, and it&apos;s read.</p>
        <FeedbackForm page={page} />
      </Card>
    </main>
  );
}
