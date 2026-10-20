import { AcmeMark } from "@/components/logo";
import { capitalize, site } from "@/lib/site";

/**
 * A still picture of the real dashboard (app/(app)/dashboard) with sample
 * rows, built from the same tokens, so it follows the light and dark themes.
 * It is a picture, not a control: inert, and hidden from selection.
 */

const SAMPLE = [
  "Spring launch",
  "Team handbook",
  "Customer research",
  "Website refresh",
  "Q3 planning",
];
const DATES = ["Oct 18", "Oct 14", "Oct 9", "Oct 2", "Sep 27"];

function Check() {
  return (
    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-ok text-surface">
      <svg
        viewBox="0 0 12 12"
        aria-hidden="true"
        className="size-2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="m2.5 6.2 2.3 2.3L9.5 3.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function StepNumber({ value }: { value: number }) {
  return (
    <span className="flex size-5 shrink-0 items-center justify-center rounded-full font-mono text-[0.625rem] text-muted shadow-[inset_0_0_0_1px_var(--line-strong)]">
      {value}
    </span>
  );
}

export function ProductPreview() {
  const { singular, plural } = site.resource;
  return (
    <div
      role="img"
      aria-label={`A preview of the ${site.name} dashboard: a Get started checklist and a list of ${plural}.`}
      className="pointer-events-none [mask-image:linear-gradient(to_bottom,black_72%,transparent)] select-none"
    >
      {/* Bezel: 8px padding, so the inner radius is 18 − 8 = 10px. */}
      <div className="rounded-[18px] bg-sunken p-2 shadow-overlay">
        <div
          inert
          className="overflow-hidden rounded-[10px] bg-canvas shadow-[0_0_0_1px_var(--line)]"
        >
          <div className="flex items-center gap-5 px-4 py-3 text-sm sm:px-6">
            <AcmeMark className="size-5" />
            <span className="relative font-medium after:absolute after:inset-x-0 after:-bottom-[0.8125rem] after:h-0.5 after:rounded-full after:bg-accent">
              Overview
            </span>
            <span className="ms-auto flex items-center gap-4 text-muted">
              <span className="relative">
                <svg
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                  className="size-4"
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
                <span className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-accent" />
              </span>
              <span className="hidden sm:inline">Sign out</span>
            </span>
          </div>

          <div className="border-t border-line px-4 pt-6 pb-10 sm:px-10 sm:pt-9">
            <p className="text-xl font-semibold sm:text-2xl">Welcome to {site.name}</p>
            <p className="mt-1 text-sm text-muted">you@company.com</p>

            <div className="mt-6 rounded-xl bg-surface shadow-raised">
              <div className="flex items-baseline gap-2 px-4 py-3 text-sm">
                <span className="font-medium">Get started</span>
                <span className="text-faint">1 of 3</span>
              </div>
              <div className="grid border-t border-line text-sm sm:grid-cols-3">
                {[
                  {
                    title: `Create your first ${singular}`,
                    body: "Done. It’s in your list below.",
                    done: true,
                  },
                  {
                    title: "Check your inbox",
                    body: "Open the bell to see news and tips.",
                    done: false,
                  },
                  {
                    title: "Invite a teammate",
                    body: "Add their email to let them know.",
                    done: false,
                  },
                ].map((step, index) => (
                  <div
                    key={step.title}
                    className={`flex gap-2.5 border-line px-4 py-3 ${index > 0 ? "hidden border-s sm:flex" : "flex"}`}
                  >
                    {step.done ? <Check /> : <StepNumber value={index + 1} />}
                    <div className="min-w-0">
                      <p className="font-medium">{step.title}</p>
                      <p className="text-muted">{step.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-7 flex items-center justify-between">
              <p className="text-sm font-medium">
                {capitalize(plural)} <span className="font-normal text-faint">{SAMPLE.length}</span>
              </p>
              <span className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-on-primary sm:text-sm">
                New {singular}
              </span>
            </div>
            <ul className="mt-3 rounded-xl bg-surface shadow-raised">
              {SAMPLE.map((name, index) => (
                <li
                  key={name}
                  className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0"
                >
                  <span className="flex size-7 items-center justify-center rounded-lg bg-sunken text-xs font-semibold text-muted">
                    {name.charAt(0)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{name}</span>
                    <span className="block text-xs text-faint">Created {DATES[index]}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
