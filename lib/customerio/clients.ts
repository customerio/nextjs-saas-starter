import "server-only";

import { APIClient, RegionEU, RegionUS, TrackClient, type Region } from "customerio-node";

import type { CustomerioConfig, CustomerioRegion } from "./config";

/**
 * Each attempt gives up after this long. Sign-in waits on these calls, so keep
 * it short: a slow Customer.io answer should never make sign-in feel stuck.
 */
const TIMEOUT_MS = 5_000;

/** Never hardcode a host. EU workspaces must use the EU endpoints. */
export function sdkRegion(region: CustomerioRegion): Region {
  return region === "eu" ? RegionEU : RegionUS;
}

/**
 * Track API client: identify people and record their events.
 * Returns `null` when the site ID or Track API key is missing.
 */
export function createTrackClient(config: CustomerioConfig): TrackClient | null {
  if (!config.track) return null;
  return new TrackClient(config.track.siteId, config.track.apiKey, {
    region: sdkRegion(config.region),
    timeout: TIMEOUT_MS,
    // Identify and track are safe to repeat, so one quick retry is fine.
    retry: { maxRetries: 1 },
  });
}

/**
 * App API client: send transactional messages.
 * Returns `null` when the App API key is missing.
 */
export function createAppClient(config: CustomerioConfig): APIClient | null {
  if (!config.appApiKey) return null;
  return new APIClient(config.appApiKey, {
    region: sdkRegion(config.region),
    timeout: TIMEOUT_MS,
    // No retries: if a send times out, Customer.io may still deliver it, and a
    // retry would send the person a second copy.
    retry: { maxRetries: 0 },
  });
}
