import type { TrackClient } from "customerio-node";

import { attempt, skipped, type StepResult } from "./steps";

/** The part of the Track client we use. Tests pass a fake with this shape. */
export type Tracker = Pick<TrackClient, "identify" | "track">;

export const unixSeconds = (date: Date) => Math.floor(date.getTime() / 1000);

/** Create or update a person. Use your user ID, never the email. */
export function identify(
  track: Tracker | null,
  id: string,
  attributes: Record<string, unknown>,
): Promise<StepResult> {
  if (!track) return Promise.resolve(skipped("missing_track_keys"));
  return attempt(() => track.identify(id, attributes));
}

/** Record an event on a person. Build campaigns on these in Customer.io. */
export function trackEvent(
  track: Tracker | null,
  id: string,
  name: string,
  data: Record<string, unknown> = {},
): Promise<StepResult> {
  if (!track) return Promise.resolve(skipped("missing_track_keys"));
  return attempt(() => track.track(id, { name, data }));
}
