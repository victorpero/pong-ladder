export const VERIFICATION_EMAIL_SUBJECT = "Verify your Pong Ladder email";

type VerificationEmailInput = {
  verificationUrl: string;
  expiresInMinutes: number;
};

type VerificationEmail = {
  subject: string;
  html: string;
  text: string;
};

const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

const COLORS = {
  page: "#F1F5F9",
  card: "#FFFFFF",
  footer: "#F8FAFC",
  border: "#E5E7EB",
  ink: "#111827",
  body: "#374151",
  muted: "#6B7280",
  brand: "#E11D2E",
  brandDark: "#B91C1C"
};

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeVerificationUrl(value: string) {
  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    throw new Error("A verification email requires an absolute verification URL.");
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("A verification URL must use HTTP or HTTPS.");
  }

  return parsed.toString();
}

function formatExpiry(minutes: number) {
  if (!Number.isFinite(minutes) || minutes <= 0) {
    throw new Error("A verification email requires a positive expiry in minutes.");
  }

  const rounded = Math.round(minutes);

  return rounded === 1 ? "1 minute" : `${rounded} minutes`;
}

function renderHtml(escapedUrl: string, expiry: string) {
  const preheader = `Confirm this address to activate your Pong Ladder account. The link expires in ${expiry}.`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<title>${escapeHtml(VERIFICATION_EMAIL_SUBJECT)}</title>
<style>
body { margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: ${COLORS.page}; }
table { border-collapse: collapse; }
a { color: ${COLORS.brandDark}; }
@media only screen and (max-width: 620px) {
  .pl-card { width: 100% !important; }
  .pl-pad { padding-left: 20px !important; padding-right: 20px !important; }
  .pl-heading { font-size: 22px !important; line-height: 28px !important; }
  .pl-button { width: 100% !important; }
  .pl-button a { display: block !important; }
}
</style>
</head>
<body style="margin:0;padding:0;background-color:${COLORS.page};">
<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:${COLORS.page};">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${COLORS.page};">
<tr>
<td align="center" style="padding:24px 12px;">
<table role="presentation" class="pl-card" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background-color:${COLORS.card};border:1px solid ${COLORS.border};border-radius:12px;">
<tr>
<td class="pl-pad" align="left" bgcolor="${COLORS.brand}" style="background-color:${COLORS.brand};border-radius:12px 12px 0 0;padding:20px 32px;font-family:${FONT_STACK};font-size:18px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#FFFFFF;">Pong Ladder</td>
</tr>
<tr>
<td class="pl-pad" align="left" style="padding:32px;">
<p style="margin:0 0 8px;font-family:${FONT_STACK};font-size:12px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:${COLORS.muted};">Account verification</p>
<h1 class="pl-heading" style="margin:0 0 16px;font-family:${FONT_STACK};font-size:26px;line-height:32px;font-weight:bold;color:${COLORS.ink};">Verify your email address</h1>
<p style="margin:0 0 24px;font-family:${FONT_STACK};font-size:15px;line-height:24px;color:${COLORS.body};">Confirm this address to finish setting up your Pong Ladder account. Verification keeps ladder standings tied to real players and lets your organization reach you about challenges and results.</p>
<table role="presentation" class="pl-button" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;">
<tr>
<td align="center" bgcolor="${COLORS.brand}" style="background-color:${COLORS.brand};border-radius:8px;mso-padding-alt:14px 28px;">
<a href="${escapedUrl}" style="display:inline-block;padding:14px 28px;font-family:${FONT_STACK};font-size:16px;line-height:20px;font-weight:bold;color:#FFFFFF;text-decoration:none;border-radius:8px;">Verify email</a>
</td>
</tr>
</table>
<p style="margin:0 0 24px;font-family:${FONT_STACK};font-size:14px;line-height:22px;color:${COLORS.body};">This link expires in ${escapeHtml(expiry)} and can be used once.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td style="border-top:1px solid ${COLORS.border};padding:24px 0 0;font-family:${FONT_STACK};font-size:13px;line-height:20px;color:${COLORS.muted};">
<p style="margin:0 0 8px;font-family:${FONT_STACK};font-size:13px;line-height:20px;color:${COLORS.muted};">If the button does not work, copy this address into your browser:</p>
<p style="margin:0 0 20px;font-family:${FONT_STACK};font-size:13px;line-height:20px;word-break:break-all;"><a href="${escapedUrl}" style="color:${COLORS.brandDark};text-decoration:underline;word-break:break-all;">${escapedUrl}</a></p>
<p style="margin:0;font-family:${FONT_STACK};font-size:13px;line-height:20px;color:${COLORS.muted};">If you did not create or update a Pong Ladder account, you can ignore this email and nothing will change.</p>
</td>
</tr>
</table>
</td>
</tr>
<tr>
<td class="pl-pad" align="left" bgcolor="${COLORS.footer}" style="background-color:${COLORS.footer};border-top:1px solid ${COLORS.border};border-radius:0 0 12px 12px;padding:20px 32px;font-family:${FONT_STACK};font-size:12px;line-height:18px;color:${COLORS.muted};">Pong Ladder sends this message only when an account is created or its email address changes.</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`;
}

function renderText(url: string, expiry: string) {
  return [
    "PONG LADDER",
    "",
    "Verify your email address",
    "",
    "Confirm this address to finish setting up your Pong Ladder account. Verification keeps ladder standings tied to real players and lets your organization reach you about challenges and results.",
    "",
    "Open this link to verify your email:",
    url,
    "",
    `This link expires in ${expiry} and can be used once.`,
    "",
    "If you did not create or update a Pong Ladder account, you can ignore this email and nothing will change.",
    ""
  ].join("\n");
}

export function renderVerificationEmail({
  verificationUrl,
  expiresInMinutes
}: VerificationEmailInput): VerificationEmail {
  const url = safeVerificationUrl(verificationUrl);
  const expiry = formatExpiry(expiresInMinutes);

  return {
    subject: VERIFICATION_EMAIL_SUBJECT,
    html: renderHtml(escapeHtml(url), expiry),
    text: renderText(url, expiry)
  };
}
