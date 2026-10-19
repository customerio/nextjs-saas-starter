import { sdkRegion } from "./clients";
import type { CustomerioRegion } from "./config";

const strip = (url: string) => url.replace(/^https:\/\//, "");

/**
 * The URLs each signup step calls, for display. They come from the SDK's
 * region objects, so they always match where requests really go.
 */
export function signupEndpoints(region: CustomerioRegion) {
  const { trackUrl, apiUrl } = sdkRegion(region);
  return {
    identify: { method: "PUT", url: `${strip(trackUrl)}/customers/{id}` },
    event: { method: "POST", url: `${strip(trackUrl)}/customers/{id}/events` },
    email: { method: "POST", url: `${strip(apiUrl)}/send/email` },
  } as const;
}
