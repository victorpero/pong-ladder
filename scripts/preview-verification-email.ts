import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderVerificationEmail } from "../src/lib/verification-email-template";

// Deterministic placeholder data. Never render a real recipient or token here.
const PREVIEW_URL =
  "https://pongladder.example/verify-email/confirm?token=example-token-not-a-secret&next=%2Fladder";

async function main() {
  const { subject, html, text } = renderVerificationEmail({
    verificationUrl: PREVIEW_URL,
    expiresInMinutes: 30
  });

  const directory = await mkdtemp(join(tmpdir(), "pong-ladder-email-"));
  const htmlPath = join(directory, "verification-email.html");
  const textPath = join(directory, "verification-email.txt");

  await writeFile(htmlPath, html, "utf8");
  await writeFile(textPath, text, "utf8");

  console.info(`Subject: ${subject}`);
  console.info(`HTML:    ${htmlPath}`);
  console.info(`Text:    ${textPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
