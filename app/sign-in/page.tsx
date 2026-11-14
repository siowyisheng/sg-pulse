import { CircleAlert } from "lucide-react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Card } from "@/ui/card";
import { LoginButton } from "@/ui/login-gate";
import { currentMe } from "@/web/session";
import { isSingpassConnected, singpassProblem } from "@/web/singpass";
import { startSingpassAction } from "../auth-actions";
import { Emoji } from "@/ui/emoji";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Log in · Yah Lah" };

export default async function SignIn({ searchParams }: { searchParams: Promise<{ problem?: string | string[] }> }) {
  if (!isSingpassConnected()) notFound();
  if (await currentMe()) redirect("/");
  const problem = singpassProblem((await searchParams).problem);
  return (
    <main className="page">
      <h1>
        <Emoji char="🔐" />
        Log in
      </h1>
      {problem && (
        <p className="problem" role="alert">
          <CircleAlert aria-hidden="true" size={18} /> {problem}
        </p>
      )}
      <Card className="stack">
        <p>Reading is open to everyone. To say Yah Lah to a Feeling or write your own, log in with Singpass, so one person has one say.</p>
        <p className="caption muted">Singpass tells us your name, date of birth and sex. We never receive your NRIC, and we don&apos;t keep your name.</p>
        <LoginButton action={startSingpassAction}>Log in with Singpass</LoginButton>
      </Card>
    </main>
  );
}
