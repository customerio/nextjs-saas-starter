/**
 * Customer.io links shown in the UI. Kept in one place so they are easy to
 * check and update.
 */
export const links = {
  app: "https://fly.customer.io",
  docs: "https://docs.customer.io/",
  trackApi: "https://docs.customer.io/integrations/api/track/",
  transactionalApi: "https://docs.customer.io/messaging/send/transactional/api/",
  accountApproval: "https://docs.customer.io/accounts/account-verification/",
  sendingDomains: "https://docs.customer.io/messaging/channels/email/deliverability/authentication/",
  campaigns: "https://docs.customer.io/messaging/send/automations/overview/",
  vercelEnvPull: "https://vercel.com/docs/cli/env",
  githubOAuthApp: "https://github.com/settings/applications/new",
};

/** The workspace in the Customer.io app. One host serves both US and EU workspaces. */
export function workspaceUrl(workspaceId: string): string {
  return `${links.app}/workspaces/${encodeURIComponent(workspaceId)}`;
}
