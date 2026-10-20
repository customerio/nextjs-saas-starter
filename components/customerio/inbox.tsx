"use client";

import type { InboxMessage } from "@customerio/cdp-analytics-browser";
import { useEffect, useId, useRef, useState } from "react";

import { useCustomerio } from "./browser-sdk";

/**
 * A bell with the person's inbox messages from Customer.io. Messages come
 * from the in-app plugin's inbox API (`analytics.inbox()`); send one with an
 * in-app message whose type is "inbox". Hidden when the browser SDK is off.
 */

type Messages = readonly InboxMessage[] | null;

/** Inbox messages have free-form properties. These are the names Customer.io templates use. */
function text(message: InboxMessage, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = message.properties?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function linkOf(message: InboxMessage): string | null {
  const href = text(message, ["link", "url", "linkUrl", "action"]);
  return href && /^https?:\/\//.test(href) ? href : null;
}

const timeFormat = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

function ago(date: Date): string {
  const minutes = Math.round((date.getTime() - Date.now()) / 60_000);
  if (Math.abs(minutes) < 60) return timeFormat.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return timeFormat.format(hours, "hour");
  return timeFormat.format(Math.round(hours / 24), "day");
}

function useInbox(): Messages {
  const { analytics, status, inApp } = useCustomerio();
  const [messages, setMessages] = useState<Messages>(null);

  useEffect(() => {
    if (status !== "ready" || !analytics || !inApp || !analytics.inbox) return;
    let inbox;
    try {
      inbox = analytics.inbox();
    } catch {
      return; // The in-app plugin did not load (for example, no site ID in CDP settings).
    }
    let active = true;
    inbox.messages().then(
      (list) => active && setMessages(list),
      () => active && setMessages([]),
    );
    const stop = inbox.onUpdates((list) => active && setMessages(list));
    return () => {
      active = false;
      stop();
    };
  }, [analytics, status, inApp]);

  return messages;
}

function BellIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path
        d="M5 8a5 5 0 0 1 10 0v3.2l1.3 2.3a.6.6 0 0 1-.5.9H4.2a.6.6 0 0 1-.5-.9L5 11.2V8Z"
        strokeLinejoin="round"
      />
      <path d="M8 16.5a2 2 0 0 0 4 0" strokeLinecap="round" />
    </svg>
  );
}

export function Inbox() {
  const { status, inApp } = useCustomerio();
  const messages = useInbox();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    panel.current?.focus();
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (status === "off" || status === "failed" || !inApp) return null;

  const unread = messages?.filter((message) => !message.opened).length ?? 0;
  const label = unread > 0 ? `Inbox, ${unread} unread` : "Inbox";

  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="relative flex size-11 items-center justify-center rounded-[10px] text-muted transition-[background-color,color] duration-150 ease-out hover:bg-sunken hover:text-ink aria-expanded:bg-sunken aria-expanded:text-ink"
      >
        <BellIcon />
        {unread > 0 ? (
          <span
            aria-hidden="true"
            className="absolute top-2 right-2 flex min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[0.625rem] leading-4 font-semibold text-on-accent tabular-nums ring-2 ring-canvas"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          ref={panel}
          id={panelId}
          role="dialog"
          aria-label="Inbox"
          tabIndex={-1}
          className="fixed inset-x-4 top-[calc(3.5rem+env(safe-area-inset-top))] z-20 origin-top animate-popover-in rounded-2xl bg-surface shadow-overlay focus:outline-none sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:mt-2 sm:w-[22rem] sm:origin-top-right"
        >
          <div className="flex items-baseline justify-between border-b border-line px-4 py-3">
            <h2 className="font-medium">Inbox</h2>
            {unread > 0 ? (
              <span className="text-sm text-muted tabular-nums">{unread} unread</span>
            ) : null}
          </div>

          {messages === null ? (
            <div className="grid gap-3 p-4" aria-label="Loading messages">
              {[0, 1].map((row) => (
                <div key={row} className="grid gap-2">
                  <div className="h-4 w-2/3 rounded bg-sunken" />
                  <div className="h-3.5 w-full rounded bg-sunken" />
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="font-medium">You’re all caught up</p>
              <p className="mx-auto mt-1 max-w-[16rem] text-sm leading-6 text-muted">
                Updates from the Acme team show up here.
              </p>
            </div>
          ) : (
            <ul className="max-h-[min(24rem,60dvh)] overflow-y-auto overscroll-contain py-1">
              {messages.map((message) => (
                <InboxRow key={message.messageId} message={message} />
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

function InboxRow({ message }: { message: InboxMessage }) {
  const title = text(message, ["title", "subject", "heading"]) ?? "Message";
  const body = text(message, ["body", "text", "message", "description"]);
  const href = linkOf(message);

  const open = () => {
    if (!message.opened) void message.markOpened();
    if (href) message.trackClick();
  };

  const content = (
    <>
      <span className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 font-medium">{title}</span>
        <time
          dateTime={message.sentAt.toISOString()}
          className="shrink-0 text-xs text-faint tabular-nums"
        >
          {ago(message.sentAt)}
        </time>
      </span>
      {body ? (
        <span className="mt-0.5 line-clamp-3 block text-sm leading-6 text-muted">{body}</span>
      ) : null}
    </>
  );

  return (
    <li className="group relative">
      {!message.opened ? (
        <span
          aria-hidden="true"
          className="absolute top-[1.15rem] left-2 size-1.5 rounded-full bg-accent"
        />
      ) : null}
      {href ? (
        <a href={href} onClick={open} className="block px-5 py-3 pr-12 hover:bg-sunken">
          {content}
          {!message.opened ? <span className="sr-only"> (unread)</span> : null}
        </a>
      ) : (
        <button
          type="button"
          onClick={open}
          className="block w-full px-5 py-3 pr-12 text-start hover:bg-sunken"
        >
          {content}
          {!message.opened ? <span className="sr-only"> (unread)</span> : null}
        </button>
      )}
      <button
        type="button"
        aria-label={`Dismiss “${title}”`}
        onClick={() => void message.markDeleted()}
        className="absolute top-1 right-1 flex size-11 items-center justify-center rounded-lg text-faint transition-[color,background-color,opacity] duration-150 hover:bg-surface hover:text-ink pointer-fine:top-2 pointer-fine:right-2 pointer-fine:size-9 pointer-fine:opacity-0 pointer-fine:group-focus-within:opacity-100 pointer-fine:group-hover:opacity-100"
      >
        <svg
          viewBox="0 0 12 12"
          aria-hidden="true"
          className="size-3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        >
          <path d="M3 3l6 6M9 3 3 9" strokeLinecap="round" />
        </svg>
      </button>
    </li>
  );
}
