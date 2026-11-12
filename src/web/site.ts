/**
 * The site's own address, for links that leave it (share links and their preview images). Set
 * SITE_URL when the site has its own domain; otherwise Vercel's production address is used.
 */
export function siteUrl(): string {
  const configured = process.env.SITE_URL?.trim().replace(/\/+$/, "");
  if (configured && /^https?:\/\//.test(configured)) return configured;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return vercel ? `https://${vercel}` : "http://localhost:3000";
}

/** Where a Feeling of the Day lives, for sharing. */
export const sharePath = (feeling: { cycle: string; polarity: string }) => `/feeling/${feeling.cycle}/${feeling.polarity}`;
