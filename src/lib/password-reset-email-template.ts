import { formatExpiry, renderEmailHtml, renderEmailText, safeEmailUrl } from "@/lib/email-template";

export const PASSWORD_RESET_EMAIL_SUBJECT = "Reset your Pong Ladder password";
export const GOOGLE_SIGN_IN_NOTICE_SUBJECT = "Your Pong Ladder account uses Google Sign-In";

type PasswordResetEmailInput = {
  resetUrl: string;
  expiresInMinutes: number;
};

type GoogleSignInNoticeInput = {
  loginUrl: string;
};

type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};

const RESET_HEADING = "Reset your password";
const RESET_INTRO =
  "We received a request to reset the password for your Pong Ladder account. Choose a new password with the link below. Your current password keeps working until you finish.";
const RESET_DISCLAIMER =
  "If you did not ask for a password reset, you can ignore this email and your password will not change.";
const FOOTER = "Pong Ladder sends this message only when a password reset is requested for this address.";

const NOTICE_HEADING = "Sign in with Google";
const NOTICE_INTRO =
  "We received a password reset request for your Pong Ladder account. This account signs in with Google, so there is no password to reset.";
const NOTICE_GUIDANCE =
  "Use Continue with Google on the login screen. If you can no longer reach that Google account, recover it with Google first.";
const NOTICE_DISCLAIMER =
  "If you did not ask for a password reset, you can ignore this email. Nothing about your account has changed.";

export function renderPasswordResetEmail({
  resetUrl,
  expiresInMinutes
}: PasswordResetEmailInput): RenderedEmail {
  const url = safeEmailUrl(resetUrl, "password reset");
  const expiry = formatExpiry(expiresInMinutes, "password reset");
  const note = `This link expires in ${expiry} and can be used once.`;

  return {
    subject: PASSWORD_RESET_EMAIL_SUBJECT,
    html: renderEmailHtml({
      subject: PASSWORD_RESET_EMAIL_SUBJECT,
      preheader: `Choose a new Pong Ladder password. The link expires in ${expiry}.`,
      eyebrow: "Password reset",
      heading: RESET_HEADING,
      paragraphs: [RESET_INTRO],
      button: { url, label: "Choose a new password" },
      note,
      fallback: { intro: "If the button does not work, copy this address into your browser:", url },
      disclaimer: RESET_DISCLAIMER,
      footer: FOOTER
    }),
    text: renderEmailText({
      heading: RESET_HEADING,
      paragraphs: [RESET_INTRO],
      link: { intro: "Open this link to choose a new password:", url },
      note,
      disclaimer: RESET_DISCLAIMER
    })
  };
}

export function renderGoogleSignInNoticeEmail({ loginUrl }: GoogleSignInNoticeInput): RenderedEmail {
  const url = safeEmailUrl(loginUrl, "password reset");

  return {
    subject: GOOGLE_SIGN_IN_NOTICE_SUBJECT,
    html: renderEmailHtml({
      subject: GOOGLE_SIGN_IN_NOTICE_SUBJECT,
      preheader: "This Pong Ladder account signs in with Google, so it has no password to reset.",
      eyebrow: "Password reset",
      heading: NOTICE_HEADING,
      paragraphs: [NOTICE_INTRO, NOTICE_GUIDANCE],
      button: { url, label: "Go to the login screen" },
      fallback: { intro: "If the button does not work, copy this address into your browser:", url },
      disclaimer: NOTICE_DISCLAIMER,
      footer: FOOTER
    }),
    text: renderEmailText({
      heading: NOTICE_HEADING,
      paragraphs: [NOTICE_INTRO, NOTICE_GUIDANCE],
      link: { intro: "Open the login screen here:", url },
      disclaimer: NOTICE_DISCLAIMER
    })
  };
}
