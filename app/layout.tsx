import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";
import { isDemoMode } from "@/demo-flag";
import { bylineText } from "@/core/byline";
import { colors, tokensCss } from "@/theme/tokens";
import { BylineChip } from "@/ui/badges";
import { currentMe } from "@/web/session";
import { isSingpassConnected } from "@/web/singpass";
import "./globals.css";

// next/font serves the files from our own domain and sizes the fallback font to match, so text
// doesn't jump when the real font arrives.
const inter = localFont({ src: "./fonts/inter-latin-wght-normal.woff2", variable: "--font-inter", weight: "100 900", display: "swap" });
const jakarta = localFont({ src: "./fonts/plus-jakarta-sans-latin-wght-normal.woff2", variable: "--font-jakarta", weight: "200 800", display: "swap" });

export const metadata: Metadata = {
  title: "Yah Lah",
  description: "How's Singapore feeling today? One Good and one Bad Feeling a day.",
  openGraph: { siteName: "Yah Lah", type: "website" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: colors.light.primary,
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const me = await currentMe();
  return (
    <html lang="en" className={`${inter.variable} ${jakarta.variable}`}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: tokensCss() }} />
      </head>
      <body>
        {isDemoMode() && <p className="demo-banner">Demo mode: these Feelings are samples.</p>}
        <header className="site-header">
          <a className="wordmark" href="/" aria-label="Yah Lah home">
            <img src="/brand/mark.png" alt="" width={32} height={32} />
            <span>Yah Lah</span>
          </a>
          <nav className="header-actions" aria-label="Your account">
            {me?.isAdmin && (
              <a className="header-link" href="/admin">
                Admin
              </a>
            )}
            {me && (
              <>
                <a className="header-link" href="/me" aria-label="My Feelings">
                  <BylineChip>{bylineText(me.byline)}</BylineChip>
                </a>
              </>
            )}
            {!me && isSingpassConnected() && (
              <a className="header-link" href="/sign-in">
                Log in
              </a>
            )}
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
