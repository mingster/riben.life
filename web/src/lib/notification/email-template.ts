/**
 * Platform email HTML template (favicon as logo).
 * Used by notification email channel and mail queue.
 * Placeholders: {{subject}}, {{message}}, {{footer}}, {{logoUrl}}, {{origin}}
 */

const PLATFORM_EMAIL_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{{subject}}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #374151; background-color: #f3f4f6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f3f4f6; padding: 24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="padding: 24px 24px 16px 24px; border-bottom: 1px solid #e5e7eb;">
              <a href="{{origin}}" style="text-decoration: none; display: inline-block;">
                <img src="{{logoUrl}}" alt="Logo" width="32" height="32" style="display: block; border: 0;" />
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px;">
              <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #111827;">{{subject}}</h1>
              <div style="color: #374151; white-space: pre-wrap;">{{message}}</div>
              {{footer}}
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 24px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
              This email was sent by the platform. Please do not reply directly to this message.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

/**
 * Returns the platform email HTML template with logo URL and origin set.
 * Placeholders remaining for caller: {{subject}}, {{message}}, {{footer}}
 * {{footer}} can be empty or contain HTML (e.g. <p>...</p>).
 */
export function getPlatformEmailTemplate(origin: string): string {
	const base = origin.replace(/\/$/, "");
	const logoUrl = `${base}/favicons/favicon-32x32.png`;
	return PLATFORM_EMAIL_TEMPLATE.replace(/\{\{logoUrl\}\}/g, logoUrl).replace(
		/\{\{origin\}\}/g,
		base,
	);
}

/**
 * Base URL for server-side email (links, logo). Prefers NEXT_PUBLIC_BASE_URL / NEXT_PUBLIC_API_URL.
 */
export function getBaseUrlForMail(): string {
	const base =
		process.env.NEXT_PUBLIC_BASE_URL ||
		process.env.NEXT_PUBLIC_API_URL ||
		(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);
	if (base) return base;
	return process.env.NODE_ENV === "production"
		? "https://riben.life"
		: "http://localhost:3001";
}
