import type { Metadata, Viewport } from "next";
import { Figtree, Geist_Mono } from "next/font/google";

import { CustomerioBrowser } from "@/components/customerio/browser-sdk";
import { browserSdkState } from "@/lib/customerio/browser";
import { getCustomerioConfig } from "@/lib/customerio/config";
import { getSession } from "@/lib/session";
import { site } from "@/lib/site";
import { THEME_COLORS, themeScript } from "@/lib/theme";

import "./globals.css";

// One family for everything. Next.js downloads it at build time and serves it
// from this site, with a size-matched fallback, so text never jumps.
const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: { default: site.name, template: `%s · ${site.name}` },
  description: site.description,
};

export const viewport: Viewport = {
  // The inline theme script updates these to the chosen theme's color.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: THEME_COLORS.light },
    { media: "(prefers-color-scheme: dark)", color: THEME_COLORS.dark },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  // Built on the server: only the public write key and site ID reach the browser.
  const sdk = browserSdkState(getCustomerioConfig());

  return (
    // suppressHydrationWarning: the theme script sets data-theme on <html>
    // before React loads, so the server HTML and the page differ there on purpose.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${figtree.variable} ${geistMono.variable} bg-canvas`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh font-sans text-base leading-normal text-ink">
        <a
          href="#main"
          className="sr-only rounded-lg bg-primary px-4 py-2 text-on-primary focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50"
        >
          Skip to content
        </a>
        <CustomerioBrowser
          config={sdk.enabled ? sdk.config : null}
          userId={session?.user?.id ?? null}
        >
          {children}
        </CustomerioBrowser>
      </body>
    </html>
  );
}
