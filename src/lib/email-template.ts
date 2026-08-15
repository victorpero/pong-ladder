export const EMAIL_FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

export const EMAIL_COLORS = {
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

type EmailLink = {
  intro: string;
  url: string;
};

type EmailDocument = {
  subject: string;
  preheader: string;
  eyebrow: string;
  heading: string;
  paragraphs: string[];
  button?: { url: string; label: string };
  note?: string;
  fallback?: EmailLink;
  disclaimer: string;
  footer: string;
};

type EmailPlainText = {
  heading: string;
  paragraphs: string[];
  link?: EmailLink;
  note?: string;
  disclaimer: string;
};

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function safeEmailUrl(value: string, description: string) {
  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`A ${description} email requires an absolute ${description} URL.`);
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error(`A ${description} URL must use HTTP or HTTPS.`);
  }

  return parsed.toString();
}

export function formatExpiry(minutes: number, description: string) {
  if (!Number.isFinite(minutes) || minutes <= 0) {
    throw new Error(`A ${description} email requires a positive expiry in minutes.`);
  }

  const rounded = Math.round(minutes);

  return rounded === 1 ? "1 minute" : `${rounded} minutes`;
}

function renderParagraph(text: string) {
  return `<p style="margin:0 0 24px;font-family:${EMAIL_FONT_STACK};font-size:15px;line-height:24px;color:${EMAIL_COLORS.body};">${escapeHtml(text)}</p>`;
}

function renderButton({ url, label }: { url: string; label: string }) {
  const escapedUrl = escapeHtml(url);

  return `<table role="presentation" class="pl-button" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;">
<tr>
<td align="center" bgcolor="${EMAIL_COLORS.brand}" style="background-color:${EMAIL_COLORS.brand};border-radius:8px;mso-padding-alt:14px 28px;">
<a href="${escapedUrl}" style="display:inline-block;padding:14px 28px;font-family:${EMAIL_FONT_STACK};font-size:16px;line-height:20px;font-weight:bold;color:#FFFFFF;text-decoration:none;border-radius:8px;">${escapeHtml(label)}</a>
</td>
</tr>
</table>`;
}

function renderNote(note: string) {
  return `<p style="margin:0 0 24px;font-family:${EMAIL_FONT_STACK};font-size:14px;line-height:22px;color:${EMAIL_COLORS.body};">${escapeHtml(note)}</p>`;
}

function renderFallback({ intro, url }: EmailLink) {
  const escapedUrl = escapeHtml(url);

  return `<p style="margin:0 0 8px;font-family:${EMAIL_FONT_STACK};font-size:13px;line-height:20px;color:${EMAIL_COLORS.muted};">${escapeHtml(intro)}</p>
<p style="margin:0 0 20px;font-family:${EMAIL_FONT_STACK};font-size:13px;line-height:20px;word-break:break-all;"><a href="${escapedUrl}" style="color:${EMAIL_COLORS.brandDark};text-decoration:underline;word-break:break-all;">${escapedUrl}</a></p>`;
}

export function renderEmailHtml({
  subject,
  preheader,
  eyebrow,
  heading,
  paragraphs,
  button,
  note,
  fallback,
  disclaimer,
  footer
}: EmailDocument) {
  const body = [
    ...paragraphs.map(renderParagraph),
    button ? renderButton(button) : "",
    note ? renderNote(note) : ""
  ]
    .filter(Boolean)
    .map((block) => `${block}\n`)
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<title>${escapeHtml(subject)}</title>
<style>
body { margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: ${EMAIL_COLORS.page}; }
table { border-collapse: collapse; }
a { color: ${EMAIL_COLORS.brandDark}; }
@media only screen and (max-width: 620px) {
  .pl-card { width: 100% !important; }
  .pl-pad { padding-left: 20px !important; padding-right: 20px !important; }
  .pl-heading { font-size: 22px !important; line-height: 28px !important; }
  .pl-button { width: 100% !important; }
  .pl-button a { display: block !important; }
}
</style>
</head>
<body style="margin:0;padding:0;background-color:${EMAIL_COLORS.page};">
<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:${EMAIL_COLORS.page};">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${EMAIL_COLORS.page};">
<tr>
<td align="center" style="padding:24px 12px;">
<table role="presentation" class="pl-card" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background-color:${EMAIL_COLORS.card};border:1px solid ${EMAIL_COLORS.border};border-radius:12px;">
<tr>
<td class="pl-pad" align="left" bgcolor="${EMAIL_COLORS.brand}" style="background-color:${EMAIL_COLORS.brand};border-radius:12px 12px 0 0;padding:20px 32px;font-family:${EMAIL_FONT_STACK};font-size:18px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#FFFFFF;">Pong Ladder</td>
</tr>
<tr>
<td class="pl-pad" align="left" style="padding:32px;">
<p style="margin:0 0 8px;font-family:${EMAIL_FONT_STACK};font-size:12px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:${EMAIL_COLORS.muted};">${escapeHtml(eyebrow)}</p>
<h1 class="pl-heading" style="margin:0 0 16px;font-family:${EMAIL_FONT_STACK};font-size:26px;line-height:32px;font-weight:bold;color:${EMAIL_COLORS.ink};">${escapeHtml(heading)}</h1>
${body}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td style="border-top:1px solid ${EMAIL_COLORS.border};padding:24px 0 0;font-family:${EMAIL_FONT_STACK};font-size:13px;line-height:20px;color:${EMAIL_COLORS.muted};">
${fallback ? `${renderFallback(fallback)}\n` : ""}<p style="margin:0;font-family:${EMAIL_FONT_STACK};font-size:13px;line-height:20px;color:${EMAIL_COLORS.muted};">${escapeHtml(disclaimer)}</p>
</td>
</tr>
</table>
</td>
</tr>
<tr>
<td class="pl-pad" align="left" bgcolor="${EMAIL_COLORS.footer}" style="background-color:${EMAIL_COLORS.footer};border-top:1px solid ${EMAIL_COLORS.border};border-radius:0 0 12px 12px;padding:20px 32px;font-family:${EMAIL_FONT_STACK};font-size:12px;line-height:18px;color:${EMAIL_COLORS.muted};">${escapeHtml(footer)}</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`;
}

export function renderEmailText({ heading, paragraphs, link, note, disclaimer }: EmailPlainText) {
  const sections = [
    "PONG LADDER",
    heading,
    ...paragraphs,
    ...(link ? [`${link.intro}\n${link.url}`] : []),
    ...(note ? [note] : []),
    disclaimer
  ];

  return `${sections.join("\n\n")}\n`;
}
