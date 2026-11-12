/**
 * Whether a page is open inside another app's built-in browser (Instagram, Facebook, WhatsApp,
 * Telegram, TikTok, LINE, WeChat and the like), going by its user agent. Singpass does not work
 * there, so logging in has to move to the person's own browser. Reading is unaffected.
 *
 * Telegram on iPhone opens links in a Safari view that says nothing about Telegram, so it can't be
 * told apart from Safari; there the Singpass page itself is what the person sees.
 */
export function isInAppBrowser(userAgent: string): boolean {
  if (/Instagram|FBAN|FBAV|FB_IAB|WhatsApp|Telegram|TikTok|musical_ly|BytedanceWebview|Line\/|MicroMessenger|Snapchat|LinkedInApp|Twitter/i.test(userAgent)) {
    return true;
  }
  // An Android WebView that didn't name its app.
  return /Android/.test(userAgent) && /; wv\)/.test(userAgent);
}
