import { ChevronDown, Frown, Smile } from "lucide-react";
import type { ReactNode } from "react";
import type { FeelingOfTheDay, FeelingsOfTheDay, FrontPageLook } from "@/core/app";
import type { Polarity } from "@/core/feeling-rules";
import type { AdSettings } from "@/web/commercial";
import { formatCycle } from "@/web/format";
import { AdSlot } from "./ad-slot";
import { PolarityBadge } from "./badges";
import { Card } from "./card";
import { Emoji } from "./emoji";
import { PublishedFeelingBody } from "./published-feeling";

/**
 * The first screen of the front page, in each Front page look. Every look shows the same two
 * Feelings of the Day, the date, the way to earlier days and the ad below both Feelings; they
 * differ only in how. All but the original leave the top of the voting screen showing below, with
 * a quiet pointer to it, so it is plain there is more to scroll to.
 */

/** What the Admin area says about each look. */
export const LOOK_DESCRIPTIONS: Record<FrontPageLook, { name: string; description: string }> = {
  original: { name: "Original", description: "Two white cards with a coloured edge, filling the screen." },
  sunrise: { name: "Sunrise and dusk", description: "Edge to edge: a teal morning field over a violet evening one, with the faces large and faint." },
  highlighter: { name: "Highlighter", description: "No cards: the date large, and each Feeling in big type, marked over like a highlighter pen." },
  postcards: { name: "Postcards", description: "Two slightly tilted cards on a dotted table, each with a coloured band and a large face." },
};

const FACE = { good: Smile, bad: Frown } as const;

/** Past this many characters the big type would push the Bad Feeling off a small phone, so both step down a size. */
const LONG_TEXT = 56;

/** The first screen's classes: both Feelings share a type size, so the two never look mismatched. */
const screenClass = (today: FeelingsOfTheDay) =>
  [today.good, today.bad].some((feeling) => feeling && [...feeling.text].length > LONG_TEXT) ? "first-screen first-screen-long" : "first-screen";

interface FirstScreenProps {
  today: FeelingsOfTheDay;
  ad: AdSettings | null;
}

function Heading({ today, className = "today" }: { today: FeelingsOfTheDay; className?: string }) {
  return (
    <div className="feeling-meta spread">
      <h1 className={className}>
        <Emoji char="🇸🇬" />
        How Singapore is feeling <time dateTime={today.cycle}>{formatCycle(today.cycle)}</time>
      </h1>
      <a className="today" href="/archive">
        Earlier days
      </a>
    </div>
  );
}

function Title({ polarity }: { polarity: Polarity }) {
  return (
    <h2 id={`${polarity}-title`} className="feeling-title">
      <PolarityBadge polarity={polarity} /> Feeling of the Day
    </h2>
  );
}

function Body({ feeling }: { feeling: FeelingOfTheDay | null }) {
  return feeling ? <PublishedFeelingBody feeling={feeling} carriedOver={feeling.carriedOver} size="large" /> : <p className="muted">Nothing here today.</p>;
}

/** The quiet pointer at the foot of the first screen. It moves twice when the page opens, then rests. */
function ScrollHint() {
  return (
    <a className="scroll-hint" href="#voting">
      <span>
        <Emoji char="👇" />
        Pick tomorrow&apos;s Feelings
      </span>
      <ChevronDown aria-hidden="true" size={20} />
    </a>
  );
}

/** The ad sits below both Feelings, never between or above them. */
function Ad({ ad }: { ad: AdSettings | null }) {
  return ad ? <AdSlot ad={ad} /> : null;
}

function Original({ today, ad }: FirstScreenProps) {
  return (
    <main className="first-screen">
      <Heading today={today} />
      {(["good", "bad"] as const).map((polarity) => (
        <Card key={polarity} as="article" className={`feeling feeling-${polarity}`} aria-labelledby={`${polarity}-title`}>
          <Title polarity={polarity} />
          <Body feeling={today[polarity]} />
        </Card>
      ))}
      <Ad ad={ad} />
    </main>
  );
}

function Sunrise({ today, ad }: FirstScreenProps) {
  return (
    <main className={screenClass(today)}>
      <div className="sunrise-heading">
        <Heading today={today} />
      </div>
      {(["good", "bad"] as const).map((polarity) => {
        const Face = FACE[polarity];
        return (
          <article key={polarity} className={`sunrise-field sunrise-${polarity}`} aria-labelledby={`${polarity}-title`}>
            <Face className="sunrise-face" aria-hidden="true" size={152} strokeWidth={1.25} />
            <div className="sunrise-inner">
              <Title polarity={polarity} />
              <Body feeling={today[polarity]} />
            </div>
          </article>
        );
      })}
      <Ad ad={ad} />
      <ScrollHint />
    </main>
  );
}

function Highlighter({ today, ad }: FirstScreenProps) {
  return (
    <main className={screenClass(today)}>
      <header className="highlighter-heading">
        <h1>
          <Emoji char="🇸🇬" />
          <time dateTime={today.cycle}>{formatCycle(today.cycle)}</time>
        </h1>
        <p className="feeling-meta spread">
          <span className="today">How Singapore is feeling</span>
          <a className="today" href="/archive">
            Earlier days
          </a>
        </p>
      </header>
      {(["good", "bad"] as const).map((polarity) => (
        <article key={polarity} className={`marker marker-${polarity}`} aria-labelledby={`${polarity}-title`}>
          <Title polarity={polarity} />
          <Body feeling={today[polarity]} />
        </article>
      ))}
      <Ad ad={ad} />
      <ScrollHint />
    </main>
  );
}

function Postcards({ today, ad }: FirstScreenProps) {
  return (
    <main className={screenClass(today)}>
      <Heading today={today} />
      {(["good", "bad"] as const).map((polarity) => {
        const Face = FACE[polarity];
        return (
          <article key={polarity} className={`postcard postcard-${polarity}`} aria-labelledby={`${polarity}-title`}>
            <div className="postcard-band">
              <Title polarity={polarity} />
              <Face aria-hidden="true" size={40} strokeWidth={1.5} />
            </div>
            <div className="postcard-body">
              <Body feeling={today[polarity]} />
            </div>
          </article>
        );
      })}
      <Ad ad={ad} />
      <ScrollHint />
    </main>
  );
}

const LOOKS: Record<FrontPageLook, (props: FirstScreenProps) => ReactNode> = { original: Original, sunrise: Sunrise, highlighter: Highlighter, postcards: Postcards };

export function FirstScreen({ look, ...props }: FirstScreenProps & { look: FrontPageLook }) {
  const Look = LOOKS[look];
  return <Look {...props} />;
}
