import { trackEvent } from "@/lib/customerio/track";

import type { FlowDeps } from "./deps";

/**
 * The reference pattern for "tell Customer.io when someone does something":
 *
 *   track(deps, user.id, "project_created", { project_id, name });
 *
 * - It runs after the response (`deps.defer`), so the person never waits for
 *   Customer.io and a Customer.io problem never fails their action.
 * - It uses the person's user ID, the same one the server identifies.
 * - Event names are snake_case and past tense. Keep them stable once a
 *   campaign uses them.
 */
export type AppEvent =
  | "project_created"
  | "project_deleted"
  | "teammate_invited"
  | "onboarding_step_completed"
  | "onboarding_completed";

export function track(
  deps: FlowDeps,
  userId: string,
  name: AppEvent,
  data: Record<string, string | number | boolean> = {},
): void {
  deps.defer(async () => {
    const result = await trackEvent(deps.track, userId, name, data);
    if (result.status === "failed") {
      deps.log.warn(
        `[customerio] ${name} not tracked:`,
        result.failure.kind,
        result.failure.message,
      );
    }
  });
}
