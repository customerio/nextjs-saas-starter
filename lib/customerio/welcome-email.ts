/**
 * The inline welcome email, used when CUSTOMERIO_WELCOME_MESSAGE_ID is not set.
 *
 * Inline content is the fastest way to see a real send. For anything you plan
 * to change often, design a transactional message in Customer.io instead and
 * set its ID: then you edit the email without a deploy.
 */

export interface WelcomeEmailInput {
  name: string | null;
  appName: string;
  dashboardUrl: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function welcomeEmail({ name, appName, dashboardUrl }: WelcomeEmailInput) {
  const greeting = name ? `Hi ${name},` : "Hi there,";
  const subject = `Welcome to ${appName}`;

  const plain = [
    greeting,
    "",
    `Thanks for signing up for ${appName}. Your account is ready.`,
    "",
    `Open your dashboard: ${dashboardUrl}`,
  ].join("\n");

  // Plain, inline-styled HTML: it renders the same in every email client.
  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:32px 16px;background:#f4f7f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#0b353b;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;">
      <tr><td style="padding:32px;">
        <p style="margin:0 0 16px;font-size:16px;line-height:24px;">${escapeHtml(greeting)}</p>
        <p style="margin:0 0 24px;font-size:16px;line-height:24px;">Thanks for signing up for ${escapeHtml(appName)}. Your account is ready.</p>
        <a href="${escapeHtml(dashboardUrl)}" style="display:inline-block;padding:12px 20px;border-radius:8px;background:#0b353b;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">Open your dashboard</a>
      </td></tr>
    </table>
  </body>
</html>`;

  return { subject, html, plain };
}
