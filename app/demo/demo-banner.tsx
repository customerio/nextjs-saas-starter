import { site } from "@/lib/site";

/** One calm line above the app header in demo mode (DEMO_MODE=1). See lib/demo.ts. */
export function DemoBanner() {
  return (
    <div className="bg-sunken text-[0.8125rem] leading-5 text-muted sm:text-sm">
      <p className="mx-auto max-w-5xl px-4 py-2 text-center text-pretty sm:px-8 sm:py-2.5">
        <span
          aria-hidden="true"
          className="me-2 inline-block size-1.5 -translate-y-px rounded-full bg-accent align-middle"
        />
        You’re in the demo. Your projects are saved only in this browser.{" "}
        <a href={`${site.repoUrl}#deploy`} className="link whitespace-nowrap">
          Deploy your own
        </a>
      </p>
    </div>
  );
}
