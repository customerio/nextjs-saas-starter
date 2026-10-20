import { readiness, statusAfterSend, type Readiness } from "@/lib/customerio/readiness";
import type { StepResult } from "@/lib/customerio/steps";
import { readEmailStatus, writeEmailStatus } from "@/lib/db/store";

import type { FlowDeps } from "./deps";

/** Stores what a send told us about the workspace. Call it after every email. */
export async function recordSendOutcome(deps: FlowDeps, result: StepResult): Promise<void> {
  const update = statusAfterSend(result);
  if (update) await writeEmailStatus(deps.db, update, deps.now());
}

export async function currentReadiness(deps: Pick<FlowDeps, "db" | "config">): Promise<Readiness> {
  return readiness(deps.config, await readEmailStatus(deps.db));
}
