import { getAppBaseUrl } from "@/lib/app-url";
import { getPublicPlayerName } from "@/lib/display-name";
import { sendChallengeNotificationEmail } from "@/lib/email";
import { organizationPath } from "@/lib/organization-paths";
import { prisma } from "@/lib/prisma";

// Resend keeps an idempotency key for 24 hours and recommends an <event-type>/<entity-id>
// shape, so the same challenge always presents the same key.
export function challengeNotificationIdempotencyKey(challengeId: string) {
  return `challenge-notification/${challengeId}`;
}

// SMTP rejections quote the server's response, which can echo the envelope recipient. Only
// the transport's own classification is logged, never the provider's message text.
function describeDeliveryFailure(error: unknown) {
  const parts: string[] = [];

  if (error instanceof Error) {
    parts.push(`type=${error.name}`);
  }

  if (error && typeof error === "object") {
    const { code, responseCode } = error as { code?: unknown; responseCode?: unknown };

    if (typeof code === "string") {
      parts.push(`code=${code}`);
    }

    if (typeof responseCode === "number") {
      parts.push(`responseCode=${responseCode}`);
    }
  }

  return parts.length > 0 ? parts.join(" ") : "unclassified failure";
}

// The challenged player is emailed once per challenge. Every field comes from the stored
// challenge, so the message and its link stay inside the challenge's own organization.
export async function notifyChallengedPlayer(challengeId: string) {
  try {
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
      select: {
        notifiedAt: true,
        challenger: { select: { id: true, username: true, fullName: true } },
        challenged: { select: { email: true } },
        season: { select: { organization: { select: { name: true, slug: true } } } }
      }
    });

    if (!challenge || challenge.notifiedAt) {
      return;
    }

    const recipient = challenge.challenged.email?.trim();

    if (!recipient) {
      return;
    }

    const organization = challenge.season.organization;

    // Delivery comes first so a provider failure leaves the challenge un-notified and
    // retryable. The idempotency key, not the stored timestamp, is what keeps a retry or a
    // concurrent run from delivering a second copy.
    await sendChallengeNotificationEmail({
      to: recipient,
      challengerName: getPublicPlayerName(challenge.challenger),
      organizationName: organization.name,
      challengeUrl: `${getAppBaseUrl()}${organizationPath(organization.slug, "challenges")}`,
      idempotencyKey: challengeNotificationIdempotencyKey(challengeId)
    });

    await prisma.challenge.updateMany({
      where: { id: challengeId, notifiedAt: null },
      data: { notifiedAt: new Date() }
    });
  } catch (error) {
    // The challenge is already persisted; a delivery problem must not undo it.
    console.error(
      `[challenge notification] Challenge ${challengeId} could not be announced: ${describeDeliveryFailure(error)}`
    );
  }
}
