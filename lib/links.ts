/**
 * Outside links shown in the UI, in one place so they are easy to check.
 * AGENTS.md has a one-line curl loop that checks every one returns 200.
 */
export const links = {
  app: "https://fly.customer.io",
  docs: "https://docs.customer.io/",
  accountApproval: "https://docs.customer.io/accounts/account-verification/",
  sendingDomains:
    "https://docs.customer.io/messaging/channels/email/deliverability/authentication/",
  transactionalApi: "https://docs.customer.io/messaging/send/transactional/api/",
  testMode: "https://docs.customer.io/accounts/workspaces/overview/#message-sending",
  messagesNotSending:
    "https://docs.customer.io/messaging/send/automations/troubleshoot/messages-not-sending/",
  billing: "https://docs.customer.io/accounts/billing/how-we-bill/",
  campaigns: "https://docs.customer.io/messaging/send/automations/overview/",
  inApp: "https://docs.customer.io/messaging/channels/in-app/getting-started/",
  inbox: "https://docs.customer.io/messaging/channels/in-app/inbox/",
  dataPipelines: "https://docs.customer.io/integrations/data-in/connections/javascript/js-source/",
  vercelEnvPull: "https://vercel.com/docs/cli/env",
  customerio: "https://customer.io/",
};

/** The workspace in the Customer.io app. One host serves both US and EU workspaces. */
export function workspaceUrl(workspaceId: string | null): string {
  return workspaceId ? `${links.app}/workspaces/${encodeURIComponent(workspaceId)}` : links.app;
}
