import { Frown, Plus, Smile } from "lucide-react";
import { isFrontPageLook } from "@/core/app";
import { getApp } from "@/composition";
import { isDemoMode } from "@/demo-flag";
import { FirstScreen } from "@/ui/front-page-looks";
import { commercialSettings } from "@/web/commercial";
import { feedbackIsOn } from "@/web/feedback";
import { currentMe } from "@/web/session";
import { isSingpassConnected } from "@/web/singpass";

// The Cycle comes from the time of each request, so this page is never built ahead of time.
export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ look?: string | string[] }> }) {
  const app = await getApp();
  const [today, me, chosen, { look: asked }] = await Promise.all([app.feelingsOfTheDay(), currentMe(), app.frontPageLook(), searchParams]);
  // An Admin (or anyone, in the local demo) can try a look out with ?look=… before switching everyone to it.
  const look = (me?.isAdmin || isDemoMode()) && isFrontPageLook(asked) ? asked : chosen;
  const { ad, supportUrl } = commercialSettings();
  // Writing a Feeling needs a login; a Visitor is only asked for one when they tap the "+".
  const writeHref = me ? "/submit" : isSingpassConnected() ? "/sign-in" : null;
  return (
    <div className={`snap-page look-${look}`}>
      <FirstScreen look={look} today={today} ad={ad} />
      <section id="voting" className="voting-screen" aria-labelledby="voting-title">
        <h2 id="voting-title" className="today">
          What will Singapore feel tomorrow? Pick a mood to see today&apos;s Feelings.
        </h2>
        <a className="mood mood-good" href="/feelings/good">
          <Smile aria-hidden="true" size={96} strokeWidth={1.5} />
          <span>Good</span>
        </a>
        <a className="mood mood-bad" href="/feelings/bad">
          <Frown aria-hidden="true" size={96} strokeWidth={1.5} />
          <span>Bad</span>
        </a>
        {writeHref && (
          <a className="write-button" href={writeHref} aria-label="Write a Feeling">
            <Plus aria-hidden="true" size={28} />
          </a>
        )}
      </section>
      {(supportUrl || (me && feedbackIsOn())) && (
        <footer className="site-footer">
          {supportUrl && (
            <>
              <a href={supportUrl} target="_blank" rel="noopener noreferrer">
                Support Yah Lah
              </a>
              <p className="caption muted">Chip in to help keep Yah Lah running. This is support for the site, not a charity donation.</p>
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
