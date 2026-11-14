import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card } from "@/ui/card";
import { currentMe } from "@/web/session";
import { PushOptIn } from "./push-opt-in";
import { Emoji } from "@/ui/emoji";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Daily notification · Yah Lah" };

/** Offered right after someone joins, and from My Feelings: one notification each morning naming the day's two Hashtags. */
export default async function Notifications() {
  if (!(await currentMe())) redirect("/sign-in");
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  return (
    <main className="page">
      <h1>
        <Emoji char="🔔" />
        Daily notification
      </h1>
      <Card className="stack">
        <p>Want to know how Singapore is feeling? Get one notification each morning that names the Hashtags of the day&apos;s Good and Bad Feelings.</p>
        <p className="caption muted">One a day, nothing else. You can turn it off in your browser&apos;s settings at any time.</p>
        {publicKey ? <PushOptIn publicKey={publicKey} /> : <p className="muted">Notifications aren&apos;t switched on for this site yet.</p>}
      </Card>
    </main>
  );
}
