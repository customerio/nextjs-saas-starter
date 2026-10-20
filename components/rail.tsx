import type { ReactNode } from "react";

/**
 * A vertical list of steps joined by a line. Used for the signup flow, the
 * email setup checklist, and the signup trace. The node's shape changes with
 * the state, so color is never the only signal.
 */
export type RailState =
  "done" | "current" | "waiting" | "pending" | "skipped" | "failed" | "neutral";

export interface RailStep {
  key: string;
  title: ReactNode;
  /** Short state text shown beside the title, like "Sent" or "Blocking". */
  label?: ReactNode;
  state: RailState;
  children?: ReactNode;
}

const LABEL_COLOR: Record<RailState, string> = {
  done: "text-ok",
  current: "text-wait",
  waiting: "text-faint",
  pending: "text-muted",
  skipped: "text-faint",
  failed: "text-danger",
  neutral: "text-muted",
};

function Node({ state, index }: { state: RailState; index?: number }) {
  if (state === "done") {
    return (
      <span className="flex size-5 items-center justify-center rounded-full bg-ok text-surface">
        <svg
          viewBox="0 0 12 12"
          className="size-3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="m2.5 6.2 2.3 2.3L9.5 3.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  if (state === "failed") {
    return (
      <span className="flex size-5 items-center justify-center rounded-full bg-danger text-surface">
        <svg
          viewBox="0 0 12 12"
          className="size-3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M4 4l4 4M8 4l-4 4" strokeLinecap="round" />
        </svg>
      </span>
    );
  }
  if (state === "current") {
    return (
      <span className="flex size-5 items-center justify-center rounded-full bg-accent font-mono text-[0.6875rem] font-semibold text-on-accent tabular-nums">
        {index ?? ""}
      </span>
    );
  }
  if (state === "pending") {
    return (
      <span className="flex size-5 items-center justify-center">
        <span className="size-3.5 animate-spin rounded-full border-[1.5px] border-line-strong border-t-ink" />
      </span>
    );
  }
  const ring =
    state === "skipped" ? "border border-dashed border-faint" : "border border-line-strong";
  return (
    <span
      className={`flex size-5 items-center justify-center rounded-full bg-surface font-mono text-[0.6875rem] text-faint tabular-nums ${ring}`}
    >
      {index ?? ""}
    </span>
  );
}

export function Rail({ steps, numbered = false }: { steps: RailStep[]; numbered?: boolean }) {
  return (
    <ol className="grid">
      {steps.map((step, i) => {
        const last = i === steps.length - 1;
        return (
          <li
            key={step.key}
            className="relative grid grid-cols-[1.25rem_1fr] gap-x-3.5 pb-5 last:pb-0"
          >
            {!last ? (
              <span
                aria-hidden="true"
                className="absolute top-6 bottom-1 left-2.5 w-px -translate-x-1/2 bg-line-strong"
              />
            ) : null}
            <span aria-hidden="true" className="flex h-6 items-center">
              <Node state={step.state} index={numbered ? i + 1 : undefined} />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <h3 className="leading-6 font-medium">{step.title}</h3>
                {step.label ? (
                  <span className={`text-sm font-medium ${LABEL_COLOR[step.state]}`}>
                    {step.label}
                  </span>
                ) : null}
              </div>
              {step.children ? (
                <div className="mt-1 text-sm leading-6 text-muted">{step.children}</div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
