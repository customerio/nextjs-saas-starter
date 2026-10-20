/**
 * Your app's name and copy. "Acme" is a placeholder: change it here, then
 * swap components/logo.tsx and app/icon.svg for your own mark.
 */
export const site = {
  name: "Acme",
  description: "Acme helps your team keep track of the work that matters. A starter for your SaaS.",
  repoUrl: "https://github.com/customerio/vercel-nextjs-starter",
};

/**
 * The public URL of this deployment, for links inside emails.
 * Vercel sets these variables for you. Locally we fall back to localhost.
 */
export function siteUrl(): string {
  const env = process.env;
  if (env.AUTH_URL) return env.AUTH_URL.replace(/\/api\/auth\/?$/, "").replace(/\/$/, "");
  if (env.VERCEL_ENV === "production" && env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (env.VERCEL_URL) return `https://${env.VERCEL_URL}`;
  return `http://localhost:${env.PORT ?? 3000}`;
}
