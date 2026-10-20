/**
 * The built-in emails. Each one is fixed copy: the only value from outside is
 * a link we built, or (for the owner) the new person's verified address.
 *
 * Inline content is the fastest way to see a real send. To change the design
 * without a deploy, make a transactional message in Customer.io and set its
 * ID (CUSTOMERIO_MAGIC_LINK_MESSAGE_ID, CUSTOMERIO_WELCOME_MESSAGE_ID). The
 * same values are then passed to it as `message_data`.
 */

export interface EmailContent {
  subject: string;
  html: string;
  plain: string;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const INK = "#1c1b19";
const MUTED = "#6b6862";
const PAPER = "#f6f5f1";

/** Plain, inline-styled HTML: it renders the same in every email client. */
function layout(appName: string, rows: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:32px 16px;background:${PAPER};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:${INK};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;border:1px solid #e6e3dc;">
      <tr><td style="padding:32px;">
        <p style="margin:0 0 24px;font-size:15px;font-weight:600;">${escapeHtml(appName)}</p>
        ${rows}
      </td></tr>
    </table>
  </body>
</html>`;
}

const p = (text: string) =>
  `<p style="margin:0 0 16px;font-size:16px;line-height:24px;">${text}</p>`;
const small = (text: string) =>
  `<p style="margin:24px 0 0;font-size:13px;line-height:20px;color:${MUTED};">${text}</p>`;
const button = (href: string, label: string) =>
  `<p style="margin:8px 0 0;"><a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 20px;border-radius:8px;background:${INK};color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">${escapeHtml(label)}</a></p>`;

export function magicLinkEmail(input: {
  appName: string;
  url: string;
  expiresInMinutes: number;
}): EmailContent {
  const { appName, url, expiresInMinutes } = input;
  return {
    subject: `Sign in to ${appName}`,
    plain: [
      `Sign in to ${appName}`,
      "",
      `Open this link to sign in. It works once and expires in ${expiresInMinutes} minutes:`,
      url,
      "",
      "If you did not ask for this email, you can ignore it.",
    ].join("\n"),
    html: layout(
      appName,
      [
        p(`Use this button to sign in. It works once and expires in ${expiresInMinutes} minutes.`),
        button(url, `Sign in to ${appName}`),
        small(
          "If you did not ask for this email, you can ignore it. Nobody can sign in without it.",
        ),
      ].join("\n"),
    ),
  };
}

export function welcomeEmail(input: { appName: string; dashboardUrl: string }): EmailContent {
  const { appName, dashboardUrl } = input;
  return {
    subject: `Welcome to ${appName}`,
    plain: [
      "Welcome!",
      "",
      `Your ${appName} account is ready.`,
      "",
      `Open your dashboard: ${dashboardUrl}`,
    ].join("\n"),
    html: layout(
      appName,
      [
        p("Welcome!"),
        p(`Your ${escapeHtml(appName)} account is ready.`),
        button(dashboardUrl, "Open your dashboard"),
      ].join("\n"),
    ),
  };
}

export function ownerNotificationEmail(input: {
  appName: string;
  personEmail: string;
  isFirst: boolean;
  statusUrl: string;
}): EmailContent {
  const { appName, personEmail, isFirst, statusUrl } = input;
  const subject = isFirst ? `${appName} has its first signup` : `New signup on ${appName}`;
  return {
    subject,
    plain: [
      subject,
      "",
      `${personEmail} just confirmed their email and signed up.`,
      "",
      "This email goes to OWNER_EMAIL. To get more than this, build a campaign in Customer.io",
      "that starts on the signed_up event.",
      "",
      statusUrl,
    ].join("\n"),
    html: layout(
      appName,
      [
        p(`<strong>${escapeHtml(personEmail)}</strong> just confirmed their email and signed up.`),
        button(statusUrl, "Open the status page"),
        small(
          "This email goes to OWNER_EMAIL. To get more than this, build a campaign in Customer.io that starts on the <code>signed_up</code> event.",
        ),
      ].join("\n"),
    ),
  };
}

export function emailCheckEmail(input: { appName: string; statusUrl: string }): EmailContent {
  const { appName, statusUrl } = input;
  return {
    subject: `Email works for ${appName}`,
    plain: [
      "Email works.",
      "",
      `Customer.io accepted this test email, so ${appName} can now send sign-in links.`,
      "",
      statusUrl,
    ].join("\n"),
    html: layout(
      appName,
      [
        p("Email works."),
        p(
          `Customer.io accepted this test email, so ${escapeHtml(appName)} can now send sign-in links.`,
        ),
        button(statusUrl, "Open the status page"),
      ].join("\n"),
    ),
  };
}
