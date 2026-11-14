"use client";

import { Bell, CircleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/ui/buttons";
import { subscribeToPushAction } from "./push-actions";
import { useAppName } from "@/ui/app-name";

type Situation = "checking" | "ready" | "needs-home-screen" | "unsupported" | "blocked" | "on";

/** The key a browser wants for subscribing: the URL-safe base64 text as bytes. */
function keyBytes(text: string): Uint8Array<ArrayBuffer> {
  const padded = (text + "=".repeat((4 - (text.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

const toBase64 = (buffer: ArrayBuffer | null) => (buffer ? btoa(String.fromCharCode(...new Uint8Array(buffer))) : "");

/**
 * Offers the one push a day. On an iPhone a website can only push once it has been added to the
 * Home Screen, so that is what the person is told there.
 */
export function PushOptIn({ publicKey }: { publicKey: string }) {
  const name = useAppName();
  const [situation, setSituation] = useState<Situation>("checking");
  const [problem, setProblem] = useState<string>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const isIphone = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const installed = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
    if (isIphone && !installed) return setSituation("needs-home-screen");
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return setSituation("unsupported");
    if (Notification.permission === "denied") return setSituation("blocked");
    setSituation("ready");
  }, []);

  async function turnOn() {
    setBusy(true);
    setProblem(undefined);
    try {
      if ((await Notification.requestPermission()) !== "granted") return setSituation("blocked");
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const subscription =
        (await registration.pushManager.getSubscription()) ?? (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }));
      const { message } = await subscribeToPushAction({
        endpoint: subscription.endpoint,
        p256dh: toBase64(subscription.getKey("p256dh")),
        auth: toBase64(subscription.getKey("auth")),
      });
      if (message) return setProblem(message);
      setSituation("on");
    } catch {
      setProblem("We couldn't turn notifications on in this browser.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      {situation === "needs-home-screen" && (
        <p className="notice" role="note">
          <span>On an iPhone, notifications only work once {name} is added to your Home Screen: tap Share, then &ldquo;Add to Home Screen&rdquo;, and open {name} from there.</span>
        </p>
      )}
      {situation === "unsupported" && <p className="muted">This browser can&apos;t receive notifications. {name} still works without them.</p>}
      {situation === "blocked" && <p className="muted">Notifications are blocked for this site. You can allow them in your browser&apos;s settings.</p>}
      {situation === "on" && <p role="status">Done. You&apos;ll get one notification a morning.</p>}
      {problem && (
        <p className="problem" role="alert">
          <CircleAlert aria-hidden="true" size={18} /> {problem}
        </p>
      )}
      {(situation === "ready" || situation === "checking") && (
        <Button variant="secondary" onClick={turnOn} disabled={busy || situation === "checking"}>
          <Bell aria-hidden="true" size={18} /> Turn on the daily notification
        </Button>
      )}
      <a href="/">{situation === "on" ? "Carry on" : "Not now"}</a>
    </div>
  );
}
