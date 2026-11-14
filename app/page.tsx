import { Frown, Plus, Smile } from "lucide-react";
import { isFrontPageLook } from "@/core/app";
import { getApp } from "@/composition";
import { isDemoMode } from "@/demo-flag";
import { DESIGN_FIRST_SCREEN } from "@/ui/design-descriptions";
import { Emoji, POLARITY_EMOJI } from "@/ui/emoji";
import { FirstScreen } from "@/ui/front-page-looks";
import { currentDesign } from "@/web/design";
import { commercialSettings } from "@/web/commercial";
import { feedbackIsOn } from "@/web/feedback";
import { currentMe } from "@/web/session";
import { isSingpassConnected } from "@/web/singpass";
import { currentAppName } from "@/web/app-name";

// The Cycle comes from the time of each request, so this page is never built ahead of time.
export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ look?: string | string[] }> }) {
  const app = await getApp();
  const [today, me, chosen, { look: asked }, { design }, name] = await Promise.all([app.feelingsOfTheDay(), currentMe(), app.frontPageLook(), searchParams, currentDesign(), currentAppName()]);
  // An Admin (or anyone, in the local demo) can try a look out with ?look=… before switching everyone to it.
  // Every Design but Classic brings its own first screen.
  const look = design !== "classic" ? DESIGN_FIRST_SCREEN[design] : (me?.isAdmin || isDemoMode()) && isFrontPageLook(asked) ? asked : chosen;
  const { ad, supportUrl } = commercialSettings();
  // Writing a Feeling needs a login; a Visitor is only asked for one when they tap the "+".
  const writeHref = me ? "/submit" : isSingpassConnected() ? "/sign-in" : null;
  return (
    <div className={`snap-page look-${look}`}>
      <FirstScreen look={look} today={today} ad={ad} />
      <section id="voting" className="voting-screen" aria-labelledby="voting-title">
        <h2 id="voting-title" className="today">
          <Emoji char="🗳️" />
          What will Singapore feel tomorrow? Pick a mood to see today&apos;s Feelings.
        </h2>
        <a className="mood mood-good has-emoji" href="/feelings/good">
          <Smile aria-hidden="true" size={96} strokeWidth={1.5} />
          <Emoji char={POLARITY_EMOJI.good} className="mood-emoji" />
          <span>Good</span>
        </a>
        <a className="mood mood-bad has-emoji" href="/feelings/bad">
          <Frown aria-hidden="true" size={96} strokeWidth={1.5} />
          <Emoji char={POLARITY_EMOJI.bad} className="mood-emoji" />
          <span>Bad</span>
        </a>
        {writeHref && (
          <a className="write-button has-emoji" href={writeHref} aria-label="Write a Feeling">
            <Plus aria-hidden="true" size={28} />
            <Emoji char="✍️" />
          </a>
        )}
      </section>
      {(supportUrl || (me && feedbackIsOn())) && (
        <footer className="site-footer">
          {supportUrl && (
            <>
              <a href={supportUrl} target="_blank" rel="noopener noreferrer">
                Support {name}
              </a>
              <p className="caption muted">Chip in to help keep {name} running. This is support for the site, not a charity donation.</p>
            </>
          )}
          {me && feedbackIsOn() && (
            <a className="quiet-link" href="/feedback?from=/">
              Feedback
            </a>
          )}
        </footer>
      )}
    </div>
  );
}
