import { formatExpiry, renderEmailHtml, renderEmailText, safeEmailUrl } from "@/lib/email-template";

export { escapeHtml } from "@/lib/email-template";

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

const INTRO =
  "Confirm this address to finish setting up your Pong Ladder account. Verification keeps ladder standings tied to real players and lets your organization reach you about challenges and results.";
const DISCLAIMER =
  "If you did not create or update a Pong Ladder account, you can ignore this email and nothing will change.";
const FOOTER =
  "Pong Ladder sends this message only when an account is created or its email address changes.";

export function renderVerificationEmail({
  verificationUrl,
  expiresInMinutes
}: VerificationEmailInput): VerificationEmail {
  const url = safeEmailUrl(verificationUrl, "verification");
  const expiry = formatExpiry(expiresInMinutes, "verification");
  const note = `This link expires in ${expiry} and can be used once.`;

  return {
    subject: VERIFICATION_EMAIL_SUBJECT,
    html: renderEmailHtml({
      subject: VERIFICATION_EMAIL_SUBJECT,
      preheader: `Confirm this address to activate your Pong Ladder account. The link expires in ${expiry}.`,
      eyebrow: "Account verification",
      heading: "Verify your email address",
      paragraphs: [INTRO],
      button: { url, label: "Verify email" },
      note,
      fallback: { intro: "If the button does not work, copy this address into your browser:", url },
      disclaimer: DISCLAIMER,
      footer: FOOTER
    }),
    text: renderEmailText({
      heading: "Verify your email address",
      paragraphs: [INTRO],
      link: { intro: "Open this link to verify your email:", url },
      note,
      disclaimer: DISCLAIMER
    })
  };
}
