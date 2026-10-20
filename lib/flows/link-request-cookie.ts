import type { LinkDelivery } from "./link-request";

/**
 * A short-lived cookie that tells the "check your email" page what happened
 * to the link this browser asked for. It is httpOnly and lasts 15 minutes.
 *
 * It holds the link itself only on a Preview deployment while email cannot
 * send (see `mayRevealLink`). It never does in Production.
 */
export const LINK_COOKIE = "acme-link-request";

export interface LinkRequestNote {
  email: string;
  delivery: LinkDelivery;
  revealedUrl: string | null;
}

const DELIVERIES = new Set<LinkDelivery>(["sent", "waiting", "not_configured", "failed"]);

interface CookieWriter {
  set(
    name: string,
    value: string,
    options: { httpOnly: boolean; sameSite: "lax"; secure: boolean; path: string; maxAge: number },
  ): unknown;
}

export async function writeLinkRequestCookie(store: CookieWriter, note: LinkRequestNote) {
  store.set(LINK_COOKIE, JSON.stringify(note), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 15 * 60,
  });
}

/** The cookie comes from the browser, so check its shape before using it. */
export function parseLinkRequestCookie(raw: string | undefined): LinkRequestNote | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<LinkRequestNote>;
    if (typeof value.email !== "string" || !DELIVERIES.has(value.delivery as LinkDelivery)) {
      return null;
    }
    const revealedUrl =
      typeof value.revealedUrl === "string" && value.revealedUrl.startsWith("http")
        ? value.revealedUrl
        : null;
    return { email: value.email, delivery: value.delivery as LinkDelivery, revealedUrl };
  } catch {
    return null;
  }
}
