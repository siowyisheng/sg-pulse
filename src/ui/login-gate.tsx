"use client";

import { Copy } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { isInAppBrowser } from "@/web/in-app-browser";
import { Button, type ButtonVariant } from "./buttons";
import { Modal } from "./modal";
import { useAppName } from "./app-name";

/**
 * A button for something that needs a Singpass login. Tapping it starts the login, except inside
 * another app's browser, where Singpass can't work: there it explains how to open the page in the
 * person's own browser, with a button that copies the link. Nothing is shown until the tap.
 */
export function LoginButton({ action, variant = "secondary", large = false, children }: { action: () => Promise<void>; variant?: ButtonVariant; large?: boolean; children: ReactNode }) {
  /** The page's address, once the person has to take it to another browser. */
  const [linkToOpen, setLinkToOpen] = useState<string>();
  const name = useAppName();
  const [copied, setCopied] = useState(false);

  function stopInsideAnotherApp(event: FormEvent) {
    if (!isInAppBrowser(navigator.userAgent)) return;
    event.preventDefault();
    setLinkToOpen(window.location.href);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(linkToOpen ?? window.location.href);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      {/* A form, so the tap still counts if it lands before the page's scripts have loaded. */}
      <form action={action} onSubmit={stopInsideAnotherApp} className={large ? "wide" : undefined}>
        <Button variant={variant} type="submit" className={large ? "button-large" : undefined}>
          {children}
        </Button>
      </form>
      <Modal open={linkToOpen !== undefined} onClose={() => setLinkToOpen(undefined)} title="Open in your browser">
        <div className="stack">
          <p>Singpass can&apos;t log you in from inside this app. Open {name} in Safari or Chrome, then log in there.</p>
          <p className="caption muted selectable">{linkToOpen}</p>
          <Button variant="secondary" onClick={copyLink}>
            <Copy aria-hidden="true" size={18} /> {copied ? "Link copied" : "Copy link"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
