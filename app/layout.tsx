import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";
import { isDemoMode } from "@/demo-flag";
import { bylineText } from "@/core/byline";
import { colors, designs, tokensCss } from "@/theme/tokens";
import { BylineChip } from "@/ui/badges";
import { DESIGN_DESCRIPTIONS } from "@/ui/design-descriptions";
import { currentDesign } from "@/web/design";
import { currentMe } from "@/web/session";
import { isSingpassConnected } from "@/web/singpass";
import { siteUrl } from "@/web/site";
import "./globals.css";
import "./designs.css";
import { AppNameProvider } from "@/ui/app-name";
import { currentAppName } from "@/web/app-name";

// next/font serves the files from our own domain and sizes the fallback font to match, so text
// doesn't jump when the real font arrives.
const inter = localFont({ src: "./fonts/inter-latin-wght-normal.woff2", variable: "--font-inter", weight: "100 900", display: "swap" });
const jakarta = localFont({ src: "./fonts/plus-jakarta-sans-latin-wght-normal.woff2", variable: "--font-jakarta", weight: "200 800", display: "swap" });
// The Designs' display faces: declared everywhere, but a browser only fetches the one its Design uses, so none is preloaded.
const baloo = localFont({ src: "./fonts/baloo-2-latin-wght-normal.woff2", variable: "--font-baloo", weight: "400 800", display: "swap", preload: false });
const anton = localFont({ src: "./fonts/anton-latin-400-normal.woff2", variable: "--font-anton", weight: "400", display: "swap", preload: false });
const righteous = localFont({ src: "./fonts/righteous-latin-400-normal.woff2", variable: "--font-righteous", weight: "400", display: "swap", preload: false });
const youngSerif = localFont({ src: "./fonts/young-serif-latin-400-normal.woff2", variable: "--font-young-serif", weight: "400", display: "swap", preload: false });
const bricolage = localFont({ src: "./fonts/bricolage-grotesque-latin-wght-normal.woff2", variable: "--font-bricolage", weight: "200 800", display: "swap", preload: false });
const fredoka = localFont({ src: "./fonts/fredoka-latin-wght-normal.woff2", variable: "--font-fredoka", weight: "300 700", display: "swap", preload: false });
const fontVariables = [inter, jakarta, baloo, anton, righteous, youngSerif, bricolage, fredoka].map((font) => font.variable).join(" ");

/** Every page's title ends with the App name an Admin chose; a page sets only its own part. */
export async function generateMetadata(): Promise<Metadata> {
  const name = await currentAppName();
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: name, template: `%s · ${name}` },
    description: "How's Singapore feeling today? One Good and one Bad Feeling a day.",
    openGraph: { siteName: name, type: "website" },
  };
}

/** The browser's bar takes the header's colour in the Design being shown. */
export async function generateViewport(): Promise<Viewport> {
  const { design } = await currentDesign();
  return { width: "device-width", initialScale: 1, themeColor: design === "classic" ? colors.light.primary : designs[design].light.primary };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [me, { design, previewing }, name] = await Promise.all([currentMe(), currentDesign(), currentAppName()]);
  return (
    <html lang="en" className={fontVariables} data-design={design === "classic" ? undefined : design}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: tokensCss() }} />
      </head>
      <body>
        {isDemoMode() && <p className="demo-banner">Demo mode: these Feelings are samples.</p>}
        {previewing && (
          <p className="demo-banner preview-banner">
            Previewing the {DESIGN_DESCRIPTIONS[design].name} Design: only you see it. <a href="/design-preview?stop">Stop previewing</a>
          </p>
        )}
        <header className="site-header">
          <a className="wordmark" href="/" aria-label={`${name} home`}>
            <img src="/brand/mark.png" alt="" width={32} height={32} />
            <span>{name}</span>
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
        <AppNameProvider name={name}>{children}</AppNameProvider>
      </body>
    </html>
  );
}
