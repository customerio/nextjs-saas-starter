"use client";

import { useCustomerio, type SdkStatus } from "./browser-sdk";

const TEXT: Record<SdkStatus, { label: string; tone: string; title: string }> = {
  ready: {
    label: "Loaded",
    tone: "text-ok",
    title: "Page views and identify are going to Customer.io from this browser.",
  },
  loading: {
    label: "Loading…",
    tone: "text-muted",
    title: "Fetching your settings from Customer.io.",
  },
  failed: {
    label: "Blocked here",
    tone: "text-wait",
    title:
      "The SDK didn’t load in this browser, usually because of an ad blocker. The app works the same.",
  },
  off: { label: "Off", tone: "text-faint", title: "" },
};

/** What the browser SDK is doing in this browser right now, as one short label. */
export function SdkLiveStatus() {
  const { status } = useCustomerio();
  const text = TEXT[status];
  return (
    <span aria-live="polite" className={text.tone} title={text.title || undefined}>
      {text.label}
    </span>
  );
}
