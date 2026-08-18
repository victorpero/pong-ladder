import { getAppBaseUrl } from "@/lib/app-url";
import { getPublicPlayerName } from "@/lib/display-name";
import { sendChallengeNotificationEmail } from "@/lib/email";
import { organizationPath } from "@/lib/organization-paths";
import { prisma } from "@/lib/prisma";

// The challenged player is emailed once per challenge. Every field comes from the
// stored challenge, so the message and its link stay inside the challenge's own
// organization.
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
    const challengeUrl = `${getAppBaseUrl()}${organizationPath(organization.slug, "challenges")}`;

    // Claiming the challenge before delivery keeps a retried or concurrent run from
    // sending a second copy of the same notification.
    const claim = await prisma.challenge.updateMany({
      where: { id: challengeId, notifiedAt: null },
      data: { notifiedAt: new Date() }
    });

    if (claim.count === 0) {
      return;
    }

    await sendChallengeNotificationEmail({
      to: recipient,
      challengerName: getPublicPlayerName(challenge.challenger),
      organizationName: organization.name,
      challengeUrl
    });
  } catch (error) {
    // The challenge is already persisted; a delivery problem must not undo it.
    console.error(
      `[challenge notification] Challenge ${challengeId} could not be announced: ${
        error instanceof Error ? error.message : "unknown error"
      }`
    );
  }
}
