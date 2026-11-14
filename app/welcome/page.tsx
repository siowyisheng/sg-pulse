import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getApp } from "@/composition";
import { bylineText, type Byline } from "@/core/byline";
import { BylineChip } from "@/ui/badges";
import { Button } from "@/ui/buttons";
import { Card } from "@/ui/card";
import { singpassProblemOf, singpassProof } from "@/web/singpass";
import { confirmConsentAction, declineConsentAction } from "../auth-actions";
import { Emoji } from "@/ui/emoji";
import { currentAppName } from "@/web/app-name";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Before you join" };

const SEX_WORDS = { M: "male", F: "female" } as const;

/** The one-time consent screen: exactly what becomes public, shown before the person becomes a User. */
export default async function Welcome() {
  const proof = await singpassProof();
  if (!proof) redirect("/sign-in?problem=SINGPASS_EXPIRED");
  let byline: Byline;
  try {
    ({ byline } = await (await getApp()).consentPreview(proof));
  } catch (error) {
    redirect(`/sign-in?problem=${singpassProblemOf(error)}`);
  }
  return (
    <main className="page">
      <h1>
        <Emoji char="👋" />
        Before you join
      </h1>
      <Card className="stack">
        <h2>
          <Emoji char="👀" />
          What everyone will see
        </h2>
        <p>Each Feeling you write is public, and shows this beside it:</p>
        <p>
          <BylineChip>{bylineText(byline)}</BylineChip>
        </p>
        <ul className="stack">
          {byline.initials ? (
            <li>
              Your initials, <strong>{byline.initials}</strong>, from the first two words of your name
            </li>
          ) : (
            <li>No initials, because you are under 18</li>
          )}
          {byline.sex && (
            <li>
              Your sex, <strong>{byline.sex}</strong> ({SEX_WORDS[byline.sex]})
            </li>
          )}
          <li>
            Your age band, <strong>{byline.ageBand}</strong>
          </li>
          <li>The text of your Feeling and its Hashtag</li>
        </ul>
      </Card>
      <Card className="stack">
        <h2>
          <Emoji char="🔒" />
          What we keep
        </h2>
        <p>
          Your initials, sex and date of birth (to work out your age band), and Singpass&apos;s ID for you, so one person has one say. We don&apos;t keep your name, and we
          never receive your NRIC. There are no usernames, and nobody can message you.
        </p>
      </Card>
      <form className="actions">
        <Button variant="yah-lah" type="submit" formAction={confirmConsentAction}>
          I agree, join {await currentAppName()}
        </Button>
        <Button variant="ghost" type="submit" formAction={declineConsentAction}>
          No thanks
        </Button>
      </form>
    </main>
  );
}
