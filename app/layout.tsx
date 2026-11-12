import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { isDemoMode } from "@/demo-flag";
import "./globals.css";

export const metadata: Metadata = {
  title: "Yah Lah",
  description: "How's Singapore feeling today? One Good and one Bad Feeling a day.",
  openGraph: { siteName: "Yah Lah", type: "website" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1D3B66",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {isDemoMode() && <p className="demo-banner">Demo mode: these Feelings are samples.</p>}
        <header className="site-header">
          <a className="wordmark" href="/" aria-label="Yah Lah home">
            <img src="/brand/symbol.png" alt="" width={32} height={32} />
            <span>Yah Lah</span>
          </a>
        </header>
        {children}
      </body>
    </html>
  );
}
