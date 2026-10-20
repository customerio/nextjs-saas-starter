"use client";

import { useCustomerio, type SdkStatus } from "./browser-sdk";

const TEXT: Record<SdkStatus, { label: string; tone: string; note: string }> = {
  ready: {
    label: "Loaded",
    tone: "text-ok",
    note: "Page views and identify are going to Customer.io from this browser.",
  },
  loading: {
    label: "Loading…",
    tone: "text-muted",
    note: "Fetching your settings from Customer.io.",
  },
  failed: {
    label: "Blocked",
    tone: "text-danger",
    note: "The SDK didn’t load in this browser. An ad blocker is the usual reason. The app works the same.",
  },
  off: { label: "Off", tone: "text-faint", note: "" },
};

/** What the SDK is doing in this browser right now. */
export function SdkLiveStatus() {
  const { status, inApp } = useCustomerio();
  const text = TEXT[status];
  return (
    <div aria-live="polite">
      <p className={`font-medium ${text.tone}`}>{text.label}</p>
      {text.note ? <p className="mt-0.5 text-sm leading-6 text-muted">{text.note}</p> : null}
      {status === "ready" && !inApp ? (
        <p className="mt-1 text-sm leading-6 text-muted">
          In-app messages are off because the site ID is missing.
        </p>
      ) : null}
    </div>
  );
}
