/** Rename these when you make the starter your own. */
export const site = {
  name: "Next.js Starter",
  description: "Sign-in, a dashboard, and Customer.io messaging, ready to deploy on Vercel.",
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
