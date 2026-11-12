/** The ad networks the ad slot knows how to show. Add one here and in src/ui/ad-slot.tsx to switch. */
export type AdSettings = { network: "adsense"; client: string; slot: string };

export interface CommercialSettings {
  /** Null when ads are off. */
  ad: AdSettings | null;
  /** Where "Support Yah Lah" goes (a Stripe payment link). Null when it is off. */
  supportUrl: string | null;
}

/**
 * Nothing commercial shows unless configuration turns it on, so ads and the support link stay off
 * until the hosting plan allows them. Anything incomplete or malformed counts as off.
 */
export function commercialSettings(env: Record<string, string | undefined> = process.env): CommercialSettings {
  return { ad: adSettings(env), supportUrl: supportUrl(env.SUPPORT_URL) };
}

function adSettings(env: Record<string, string | undefined>): AdSettings | null {
  const network = env.AD_NETWORK?.trim().toLowerCase();
  if (network !== "adsense") return null;
  const client = env.ADSENSE_CLIENT?.trim() ?? "";
  const slot = env.ADSENSE_SLOT?.trim() ?? "";
  if (!/^ca-pub-\d+$/.test(client) || !/^\d+$/.test(slot)) return null;
  return { network, client, slot };
}

function supportUrl(raw: string | undefined): string | null {
  const value = raw?.trim() ?? "";
  if (!URL.canParse(value)) return null;
  return new URL(value).protocol === "https:" ? value : null;
}
