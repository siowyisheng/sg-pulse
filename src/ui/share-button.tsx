"use client";

import { Share2 } from "lucide-react";
import { useState } from "react";

/** Shares a Feeling of the Day's link: the phone's own share sheet where there is one, otherwise the link is copied. */
export function ShareButton({ path, text }: { path: string; text: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = new URL(path, window.location.origin).toString();
    try {
      if (navigator.share) await navigator.share({ title: "Yah Lah", text, url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
      }
    } catch {
      // They closed the share sheet, or the browser said no: nothing to do.
    }
  }

  return (
    <button type="button" className="quiet-button" onClick={share}>
      <Share2 aria-hidden="true" size={18} /> {copied ? "Link copied" : "Share"}
    </button>
  );
}
