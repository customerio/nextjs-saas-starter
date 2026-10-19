/**
 * Customer.io links shown in the UI. Kept in one place so they are easy to
 * check and update.
 */
export const links = {
  app: "https://fly.customer.io",
  docs: "https://customer.io/docs/",
  trackApi: "https://customer.io/docs/api/track/",
  transactionalApi: "https://customer.io/docs/journeys/transactional-api/",
  accountApproval: "https://customer.io/docs/journeys/account-approval/",
  sendingDomains: "https://customer.io/docs/journeys/authentication/",
  campaigns: "https://customer.io/docs/journeys/campaigns-in-customerio/",
  vercelEnvPull: "https://vercel.com/docs/cli/env",
  githubOAuthApp: "https://github.com/settings/applications/new",
};

/** The workspace in the Customer.io app. EU workspaces live on a separate host. */
export function workspaceUrl(workspaceId: string, region: "us" | "eu"): string {
  const host = region === "eu" ? "https://fly-eu.customer.io" : "https://fly.customer.io";
  return `${host}/workspaces/${encodeURIComponent(workspaceId)}`;
}
