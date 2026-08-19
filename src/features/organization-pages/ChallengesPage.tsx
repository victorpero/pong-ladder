import { EmptyState } from "@/components/EmptyState";
import { PlayerCombobox } from "@/components/PlayerCombobox";
import { StatusBadge } from "@/components/StatusBadge";
import { acceptChallenge, createChallenge, declineChallenge } from "@/lib/actions";
import { requireOrganizationUser } from "@/lib/authz";
import { canChallengePlayer, getActiveChallengeOpponentIds, splitActiveChallengeTargets } from "@/lib/challenge-rules";
import { getPublicPlayerNames } from "@/lib/display-name";
import { compactDate } from "@/lib/format";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";
import { t } from "@/lib/i18n/format";
import { prisma } from "@/lib/prisma";
import { getActiveSeason, getLadder } from "@/lib/queries";
import { organizationPath } from "@/lib/organization-paths";

export default async function OrganizationChallengesPage({
  locale,
  organizationSlug
}: {
  locale: Locale;
  organizationSlug: string;
}) {
  const dictionary = getDictionary(locale);
  const { session, organization } = await requireOrganizationUser(
    organizationSlug,
    organizationPath(locale, organizationSlug, "challenges")
  );
  const season = await getActiveSeason(organization.id);
  const ladder = season ? await getLadder(season.id) : [];
  const currentPlayer = session ? ladder.find((entry) => entry.userId === session.sub) : null;
  const rawChallenges = season
    ? await prisma.challenge.findMany({
        where: {
          organizationId: organization.id,
          seasonId: season.id,
        },
        include: { challenger: true, challenged: true, match: true },
        orderBy: { createdAt: "desc" }
      })
    : [];
  const challenges = [...rawChallenges].sort((left, right) => {
    const leftNeedsResponse = isIncomingPendingChallenge(left, session?.sub);
    const rightNeedsResponse = isIncomingPendingChallenge(right, session?.sub);

    if (leftNeedsResponse === rightNeedsResponse) {
      return right.createdAt.getTime() - left.createdAt.getTime();
    }

    return leftNeedsResponse ? -1 : 1;
  });
  const publicNames = getPublicPlayerNames(
    uniqueUsers([
      ...ladder.map((entry) => entry.user),
      ...challenges.flatMap((challenge) => [challenge.challenger, challenge.challenged])
    ])
  );
  const challengeTargets = currentPlayer
    ? ladder.filter((entry) => entry.userId !== currentPlayer.userId && canChallengePlayer(currentPlayer, entry))
    : [];
  const activeOpponentIds = getActiveChallengeOpponentIds(challenges, session.sub);
  const { availableTargets: availableChallengeTargets, blockedTargets: blockedActiveTargets } = splitActiveChallengeTargets(
    challengeTargets,
    activeOpponentIds
  );
  const challengeOptions = availableChallengeTargets.map((entry) => ({
    id: entry.userId,
    label: `${publicNames.get(entry.userId) ?? entry.user.username} (#${entry.currentRank})`,
    detail: t(dictionary.matches.playerRankDetail, { rank: entry.currentRank, points: entry.points })
  }));
  const currentPlayerName = currentPlayer
    ? publicNames.get(currentPlayer.userId) ?? currentPlayer.user.username
    : session?.username ?? "";

  return (
    <main className="page-shell">
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="section-band">
          <p className="label">{dictionary.challenges.label}</p>
          <h1 className="mt-1 text-3xl font-black">{dictionary.challenges.heading}</h1>

          <div className="mt-6 grid gap-3">
            {challenges.length === 0 ? (
              <EmptyState title={dictionary.challenges.emptyTitle} body={dictionary.challenges.emptyBody} />
            ) : (
              challenges.map((challenge) => {
                const needsResponse = isIncomingPendingChallenge(challenge, session?.sub);

                return (
                  <article
                    id={challenge.id}
                    key={challenge.id}
                    className={`rounded-lg border bg-white transition ${
                      needsResponse
                        ? "border-court-500 bg-court-50 p-5 shadow-soft sm:p-6"
                        : "border-line p-4"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        {needsResponse ? (
                          <p className="mb-2 inline-flex rounded-full bg-court-700 px-2.5 py-1 text-xs font-black text-white">
                            {dictionary.challenges.needsResponse}
                          </p>
                        ) : null}
                        <p className={needsResponse ? "text-xl font-black" : "text-lg font-black"}>
                          {publicNames.get(challenge.challengerId) ?? challenge.challenger.username}{" "}
                          <span className="font-bold text-muted">{dictionary.challenges.challengesVerb}</span>{" "}
                          {publicNames.get(challenge.challengedId) ?? challenge.challenged.username}
                        </p>
                        <p className="text-sm text-muted">
                          {compactDate(challenge.createdAt, locale)} ·{" "}
                          {t(dictionary.challenges.declines, { count: challenge.declinedCount })}
                        </p>
                      </div>
                      <StatusBadge status={challenge.status} locale={locale} />
                    </div>

                    {needsResponse ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <form action={acceptChallenge}>
                          <input type="hidden" name="organizationSlug" value={organizationSlug} />
                          <input type="hidden" name="challengeId" value={challenge.id} />
                          <button className="button" type="submit">
                            {dictionary.challenges.accept}
                          </button>
                        </form>
                        <form action={declineChallenge}>
                          <input type="hidden" name="organizationSlug" value={organizationSlug} />
                          <input type="hidden" name="challengeId" value={challenge.id} />
                          <button className="button-danger" type="submit">
                            {dictionary.challenges.decline}
                          </button>
                        </form>
                      </div>
                    ) : null}
                  </article>
                );
              })
            )}
          </div>
        </section>

        <aside className="section-band self-start">
          <h2 className="text-xl font-black">{dictionary.challenges.createHeading}</h2>
          {!session ? (
            <p className="mt-3 text-sm text-muted">{dictionary.challenges.loginFirst}</p>
          ) : !season || !currentPlayer ? (
            <p className="mt-3 text-sm text-muted">{dictionary.challenges.joinSeasonFirst}</p>
          ) : (
            <form action={createChallenge} className="mt-4 grid gap-3">
              <input type="hidden" name="organizationSlug" value={organizationSlug} />
              <input type="hidden" name="seasonId" value={season.id} />
              <label className="grid gap-1">
                <span className="label">{dictionary.challenges.challengerLabel}</span>
                <input className="field" value={currentPlayerName} readOnly />
              </label>
              <PlayerCombobox
                name="challengedId"
                label={dictionary.challenges.challengedLabel}
                players={challengeOptions}
                disabled={challengeOptions.length === 0}
              />
              <button className="button" type="submit" disabled={challengeOptions.length === 0}>
                {dictionary.challenges.createButton}
              </button>
              {blockedActiveTargets.length > 0 ? (
                <p className="rounded-md border border-line bg-slate-50 p-3 text-sm font-semibold text-muted">
                  {t(dictionary.challenges.blockedTargets, {
                    players: blockedActiveTargets
                      .map((entry) => publicNames.get(entry.userId) ?? entry.user.username)
                      .join(", ")
                  })}
                </p>
              ) : null}
            </form>
          )}
        </aside>
      </div>
    </main>
  );
}

function uniqueUsers<T extends { id: string }>(users: T[]) {
  return Array.from(new Map(users.map((user) => [user.id, user])).values());
}

function isIncomingPendingChallenge(challenge: { challengedId: string; status: string }, userId?: string) {
  return Boolean(userId && challenge.challengedId === userId && challenge.status === "Pending");
}
