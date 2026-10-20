import { site } from "@/lib/site";

/** Points the site owner to their sign-in link in the Vercel logs. */
export function OwnerLogsHint({ className }: { className?: string }) {
  return (
    <p className={`text-sm leading-5 text-faint ${className ?? ""}`}>
      Own this site? Your sign-in link is in your Vercel logs.{" "}
      <a
        href={`${site.repoUrl}#first-sign-in-after-deploying`}
        className="-my-3 inline-flex min-h-11 items-center link"
      >
        See how
      </a>
    </p>
  );
}
