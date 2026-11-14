import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getApp } from "@/composition";
import { QueuedForTomorrowChip } from "@/ui/badges";
import { Card } from "@/ui/card";
import { ConsentReminder } from "@/ui/consent-reminder";
import { currentMe } from "@/web/session";
import { SubmitForm } from "./submit-form";
import { Emoji } from "@/ui/emoji";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Write a Feeling · Yah Lah" };

export default async function Submit() {
  const me = await currentMe();
  if (!me) redirect("/sign-in");
  const [submission, hashtagsInUse] = await Promise.all([me.submission(), (await getApp()).hashtagsInUse()]);
  return (
    <main className="page">
      <h1>
        <Emoji char="✍️" />
        Write a Feeling
      </h1>
      {submission.canSubmit ? (
        <Card className="stack">
          {submission.queued && (
            <p className="feeling-meta">
              <QueuedForTomorrowChip /> It&apos;s past 9pm, so this one joins tomorrow&apos;s Feelings. Nobody sees it until then.
            </p>
          )}
          <SubmitForm hashtagsInUse={hashtagsInUse} reminder={<ConsentReminder byline={me.byline} />} />
        </Card>
      ) : (
        <Card className="stack">
          <p>{submission.queued ? "You already have a Feeling queued for tomorrow." : "You've written your Feeling for today. You can write another after 9pm, for tomorrow."}</p>
          <a href="/me">See my Feelings</a>
        </Card>
      )}
    </main>
  );
}
