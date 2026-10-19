import type { ReactNode } from "react";

export type TraceState = "planned" | "done" | "waiting" | "skipped" | "failed";

export interface TraceStep {
  title: string;
  method: "PUT" | "POST";
  url: string;
  payload: string;
  state: TraceState;
  note?: ReactNode;
}

const STATE_LABEL: Record<TraceState, string | null> = {
  planned: null,
  done: "Sent",
  waiting: "Waiting on email setup",
  skipped: "Skipped",
  failed: "Failed",
};

const STATE_TEXT: Record<TraceState, string> = {
  planned: "text-faint",
  done: "text-ok",
  waiting: "text-warn",
  skipped: "text-faint",
  failed: "text-danger",
};

/** Lets long URLs wrap after a slash instead of in the middle of a word. */
function BreakableUrl({ url }: { url: string }) {
  const parts = url.split("/");
  return parts.map((part, index) => (
    <span key={index}>
      {part}
      {index < parts.length - 1 ? (
        <>
          /<wbr />
        </>
      ) : null}
    </span>
  ));
}

/** The node on the rail. Shape changes with state, so color is never the only signal. */
function Node({ state }: { state: TraceState }) {
  const shape: Record<TraceState, string> = {
    planned: "border border-line-strong bg-surface",
    done: "bg-ok",
    waiting: "border-2 border-warn bg-surface",
    skipped: "border border-dashed border-faint bg-surface",
    failed: "bg-danger rotate-45 scale-90",
  };
  return <span aria-hidden="true" className={`block size-2.5 rounded-[2px] ${shape[state]}`} />;
}

export function SignupTrace({
  title,
  aside,
  steps,
  footer,
}: {
  title: string;
  aside?: ReactNode;
  steps: TraceStep[];
  footer?: ReactNode;
}) {
  return (
    <section aria-label={title} className="rounded-xl bg-surface shadow-card">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line px-5 py-3.5">
        <h2 className="text-sm font-medium">{title}</h2>
        {aside ? <div className="min-w-0 text-sm break-all text-muted">{aside}</div> : null}
      </div>
      <ol className="px-5 py-2">
        {steps.map((step, index) => {
          const label = STATE_LABEL[step.state];
          const last = index === steps.length - 1;
          return (
            <li key={step.title} className="relative grid grid-cols-[1.25rem_1fr] gap-x-3 py-3.5">
              {!last ? (
                <span
                  aria-hidden="true"
                  className="absolute top-[1.9rem] bottom-[-0.6rem] left-[0.6rem] w-px -translate-x-1/2 bg-line-strong"
                />
              ) : null}
              <span className="flex h-6 items-center justify-center">
                <Node state={step.state} />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <h3 className="font-medium">{step.title}</h3>
                  {label ? (
                    <span className={`text-sm font-medium ${STATE_TEXT[step.state]}`}>{label}</span>
                  ) : null}
                </div>
                <p className="mt-1 flex min-w-0 items-baseline gap-2 font-mono text-[0.8125rem] leading-5 text-code-ink">
                  <span className="shrink-0 rounded bg-sunken px-1.5 text-[0.6875rem] leading-5 font-medium tracking-wide text-muted">
                    {step.method}
                  </span>
                  <span className="min-w-0 break-words">
                    <BreakableUrl url={step.url} />
                  </span>
                </p>
                <p className="mt-1 font-mono text-[0.8125rem] leading-5 text-muted">
                  {step.payload}
                </p>
                {step.note ? (
                  <div className="mt-2 text-sm leading-6 text-muted">{step.note}</div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
      {footer ? (
        <div className="border-t border-line px-5 py-3.5 text-sm leading-6 text-muted">
          {footer}
        </div>
      ) : null}
    </section>
  );
}
