/**
 * Your app's name and copy. "Acme" is a placeholder: change it here, then
 * swap components/logo.tsx and app/icon.svg for your own mark.
 */
export const site = {
  name: "Acme",
  /**
   * The app's one example resource. Change these words to rename it
   * everywhere in the UI ("project" → "board", "space", "workspace", …).
   * The database table stays `projects` unless you rename it too.
   */
  resource: { singular: "project", plural: "projects" },
  description: "Sign up with your email and get started in a minute.",
  repoUrl: "https://github.com/customerio/nextjs-saas-starter",
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

/** "project" → "Project". For labels at the start of a sentence. */
export function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}
