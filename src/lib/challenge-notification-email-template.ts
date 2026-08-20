import { renderEmailHtml, renderEmailText, safeEmailUrl } from "@/lib/email-template";

export const CHALLENGE_NOTIFICATION_EMAIL_SUBJECT = "You have a new Pong Ladder challenge";

type ChallengeNotificationEmailInput = {
  challengerName: string;
  organizationName: string;
  challengeUrl: string;
};

type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};

const HEADING = "You have a new challenge";
const DISCLAIMER =
  "If you do not want to play this match, you can decline it in Pong Ladder and your ladder position stays as it is.";
const FOOTER = "Pong Ladder sends this message only when another player challenges you.";

function requireText(value: string, field: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error(`A challenge notification email requires a ${field}.`);
  }

  return trimmed;
}

export function renderChallengeNotificationEmail({
  challengerName,
  organizationName,
  challengeUrl
}: ChallengeNotificationEmailInput): RenderedEmail {
  const challenger = requireText(challengerName, "challenger name");
  const organization = requireText(organizationName, "organization name");
  const url = safeEmailUrl(challengeUrl, "challenge notification");
  const intro = `${challenger} has challenged you to a match in ${organization}.`;
  const guidance =
    "Open Pong Ladder to accept or decline the challenge, then report the result once you have played.";

  return {
    subject: CHALLENGE_NOTIFICATION_EMAIL_SUBJECT,
    html: renderEmailHtml({
      subject: CHALLENGE_NOTIFICATION_EMAIL_SUBJECT,
      preheader: intro,
      eyebrow: "New challenge",
      heading: HEADING,
      paragraphs: [intro, guidance],
      button: { url, label: "View challenge" },
      fallback: { intro: "If the button does not work, copy this address into your browser:", url },
      disclaimer: DISCLAIMER,
      footer: FOOTER
    }),
    text: renderEmailText({
      heading: HEADING,
      paragraphs: [intro, guidance],
      link: { intro: "Open this link to view the challenge:", url },
      disclaimer: DISCLAIMER
    })
  };
}
