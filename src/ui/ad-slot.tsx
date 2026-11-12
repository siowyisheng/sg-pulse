"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";
import { sizes } from "@/theme/tokens";
import type { AdSettings } from "@/web/commercial";

const AD_SIZE = { display: "inline-block", width: parseInt(sizes.adWidth), height: parseInt(sizes.adHeight) } as const;

function AdSenseUnit({ client, slot }: { client: string; slot: string }) {
  const requested = useRef(false);
  useEffect(() => {
    if (requested.current) return;
    requested.current = true;
    const queue = ((window as { adsbygoogle?: unknown[] }).adsbygoogle ??= []);
    queue.push({});
  }, []);
  return (
    <>
      <Script async src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`} crossOrigin="anonymous" strategy="afterInteractive" />
      <ins className="adsbygoogle" style={AD_SIZE} data-ad-client={client} data-ad-slot={slot} />
    </>
  );
}

/**
 * The one ad on the site: a fixed-size banner whose space is set aside before it loads, so nothing
 * moves when it arrives. Which network fills it is a setting.
 */
export function AdSlot({ ad }: { ad: AdSettings }) {
  return (
    <aside className="ad-slot" aria-label="Advertisement">
      <span className="ad-label">Advertisement</span>
      <div className="ad-frame">{ad.network === "adsense" && <AdSenseUnit client={ad.client} slot={ad.slot} />}</div>
    </aside>
  );
}
