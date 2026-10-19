import { describeEnv, type CustomerioConfig } from "@/lib/customerio";
import { links, workspaceUrl } from "@/lib/links";

function Status({ isSet, optional }: { isSet: boolean; optional: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 text-sm ${isSet ? "text-ok" : "text-faint"}`}
    >
      <span
        aria-hidden="true"
        className={`size-2 rounded-[2px] ${isSet ? "bg-ok" : "border border-faint"}`}
      />
      {isSet ? "Set" : optional ? "Optional" : "Not set"}
    </span>
  );
}

export function ConnectionPanel({ config }: { config: CustomerioConfig }) {
  const vars = describeEnv();
  const ready = Boolean(config.track && config.appApiKey);
  const partly = Boolean(config.track || config.appApiKey);
  const summary = ready ? "Connected" : partly ? "Partly connected" : "Not connected";

  return (
    <section aria-labelledby="connection" className="rounded-xl bg-surface shadow-card">
      <div className="border-b border-line px-5 py-4">
        <h2 id="connection" className="font-medium">
          Customer.io connection
        </h2>
        <p className="mt-1 text-sm text-muted">
          {summary}. Values stay on the server. This panel only shows whether each one is set.
        </p>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 border-b border-line px-5 py-4 text-sm">
        <dt className="text-muted">Region</dt>
        <dd className="text-end">
          {config.region === "eu" ? "EU" : "US"}
          {config.regionSource === "default" ? (
            <span className="text-faint"> (default)</span>
          ) : null}
        </dd>
        <dt className="text-muted">Workspace</dt>
        <dd className="min-w-0 text-end">
          {config.workspaceId ? (
            <a
              href={workspaceUrl(config.workspaceId, config.region)}
              className="font-mono tabular-nums underline decoration-line-strong underline-offset-4 hover:decoration-ink"
            >
              {config.workspaceId}
            </a>
          ) : (
            <span className="text-faint">Not set</span>
          )}
        </dd>
      </dl>

      {config.problems.length > 0 ? (
        <ul className="grid gap-2 border-b border-line bg-warn-surface px-5 py-4 text-sm leading-6">
          {config.problems.map((problem) => (
            <li key={problem.variable}>
              <code className="font-mono text-[0.8125rem] font-medium text-warn">
                {problem.variable}
              </code>
              <span className="text-ink"> {problem.message}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <ul className="px-5 py-2">
        {vars.map(({ info, isSet }) => (
          <li key={info.name} className="border-t border-line py-3 first:border-t-0">
            <div className="flex items-baseline justify-between gap-3">
              <code className="min-w-0 font-mono text-[0.8125rem] break-all">{info.name}</code>
              <Status isSet={isSet} optional={info.setBy === "you"} />
            </div>
            <p className="mt-1 text-sm leading-6 text-muted">{info.purpose}</p>
          </li>
        ))}
      </ul>

      {!config.track ? (
        <div className="border-t border-line px-5 py-4 text-sm leading-6 text-muted">
          <p>
            <span className="font-medium text-ink">Running locally?</span> Run{" "}
            <code className="font-mono text-[0.8125rem] text-ink">vercel env pull</code> to copy
            your project’s variables into{" "}
            <code className="font-mono text-[0.8125rem] text-ink">.env.local</code>, then restart
            the dev server.{" "}
            <a
              href={links.vercelEnvPull}
              className="font-medium text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink"
            >
              How it works
            </a>
          </p>
        </div>
      ) : null}
    </section>
  );
}
