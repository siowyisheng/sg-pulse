import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Button } from "@/ui/buttons";
import { Card } from "@/ui/card";
import { currentMe } from "@/web/session";
import { deleteAccountAction } from "../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Delete my account · Yah Lah", robots: { index: false } };

/** Deleting an account, with what it does and doesn't remove said plainly first. */
export default async function DeleteAccount() {
  const me = await currentMe();
  if (!me) redirect("/sign-in");
  const winners = (await me.myFeelings()).filter((feeling) => feeling.state === "winner");
  return (
    <main className="page">
      <h1>Delete my account</h1>
      <Card className="stack">
        <h2>What goes</h2>
        <p>Your initials, sex, date of birth and Singpass ID, your Upvotes, and every Feeling of yours that has not been a Feeling of the Day. Nothing is kept to bring them back.</p>
        <h2>What stays</h2>
        <p>
          A Feeling of yours that has been a Feeling of the Day stays on the front page and in the archive, with the Byline it has now, until you ask for it to be removed.
          {winners.length > 0 ? ` You have ${winners.length}.` : " You have none."}
        </p>
        <p className="caption muted">A record that you wrote and Reported things, with no name on it, is kept for 12 months.</p>
      </Card>
      <form className="stack" action={deleteAccountAction}>
        {winners.length > 0 && (
          <label className="check-field">
            <input type="checkbox" name="alsoRemoveWinners" /> Also ask for my Feelings of the Day to be removed. Once your account is gone there is no way to ask, so this is the time.
          </label>
        )}
        <div className="actions">
          <Button variant="secondary" type="submit">
            Delete my account for good
          </Button>
          <a href="/me">Keep it</a>
        </div>
      </form>
    </main>
  );
}
