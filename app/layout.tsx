import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";

import { CustomerioBrowser } from "@/components/customerio/browser-sdk";
import { browserSdkState } from "@/lib/customerio/browser";
import { getCustomerioConfig } from "@/lib/customerio/config";
import { getSession } from "@/lib/session";
import { site } from "@/lib/site";

import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  axes: ["opsz", "wdth"],
});

export const metadata: Metadata = {
  title: { default: site.name, template: `%s · ${site.name}` },
  description: site.description,
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f5f2" },
    { media: "(prefers-color-scheme: dark)", color: "#111315" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  // Built on the server: only the public write key and site ID reach the browser.
  const sdk = browserSdkState(getCustomerioConfig());

  return (
    <html
      lang="en"
      className={`${geist.variable} ${geistMono.variable} ${bricolage.variable} bg-canvas`}
    >
      <body className="min-h-dvh font-sans text-base text-ink">
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
