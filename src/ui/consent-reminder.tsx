import type { Byline } from "@/core/byline";
import { bylineText } from "@/core/byline";

/** The short reminder shown each time a User submits a Feeling. */
export function ConsentReminder({ byline }: { byline: Byline }) {
  return (
    <p className="caption muted">
      Everyone will see your Feeling with your Byline: <strong>{bylineText(byline)}</strong>. It can&apos;t be edited or withdrawn.
    </p>
  );
}
