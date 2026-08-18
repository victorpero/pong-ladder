import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderChallengeNotificationEmail } from "../src/lib/challenge-notification-email-template";
import {
  renderGoogleSignInNoticeEmail,
  renderPasswordResetEmail
} from "../src/lib/password-reset-email-template";
import { renderVerificationEmail } from "../src/lib/verification-email-template";

// Deterministic placeholder data. Never render a real recipient or token here.
const VERIFICATION_URL =
  "https://pongladder.example/verify-email/confirm?token=example-token-not-a-secret&next=%2Fladder";
const RESET_URL = "https://pongladder.example/reset-password?token=example-token-not-a-secret";
const LOGIN_URL = "https://pongladder.example/login";
const CHALLENGE_URL = "https://pongladder.example/org/example-club/challenges";

const previews = [
  {
    name: "verification-email",
    email: renderVerificationEmail({ verificationUrl: VERIFICATION_URL, expiresInMinutes: 30 })
  },
  {
    name: "password-reset-email",
    email: renderPasswordResetEmail({ resetUrl: RESET_URL, expiresInMinutes: 30 })
  },
  {
    name: "google-sign-in-notice-email",
    email: renderGoogleSignInNoticeEmail({ loginUrl: LOGIN_URL })
  },
  {
    name: "challenge-notification-email",
    email: renderChallengeNotificationEmail({
      challengerName: "Alex Example",
      organizationName: "Example Club",
      challengeUrl: CHALLENGE_URL
    })
  }
];

async function main() {
  const directory = await mkdtemp(join(tmpdir(), "pong-ladder-email-"));

  for (const { name, email } of previews) {
    const htmlPath = join(directory, `${name}.html`);
    const textPath = join(directory, `${name}.txt`);

    await writeFile(htmlPath, email.html, "utf8");
    await writeFile(textPath, email.text, "utf8");

    console.info(`Subject: ${email.subject}`);
    console.info(`HTML:    ${htmlPath}`);
    console.info(`Text:    ${textPath}`);
    console.info("");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
