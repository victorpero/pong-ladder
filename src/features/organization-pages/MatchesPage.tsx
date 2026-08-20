import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { PlayerCombobox } from "@/components/PlayerCombobox";
import { registerMatchResult } from "@/lib/actions";
import { requireOrganizationUser } from "@/lib/authz";
import { getPublicPlayerNames } from "@/lib/display-name";
import { compactDate } from "@/lib/format";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";
import { t } from "@/lib/i18n/format";
import { matchFeedOrderBy } from "@/lib/match-feed";
import { prisma } from "@/lib/prisma";
import { getActiveSeason, getLadder } from "@/lib/queries";
import { organizationPath } from "@/lib/organization-paths";

export default async function OrganizationMatchesPage({
  locale,
  organizationSlug,
  searchParams
}: {
  locale: Locale;
  organizationSlug: string;
  searchParams?: { challengeId?: string };
}) {
  const dictionary = getDictionary(locale);
  const { session, organization } = await requireOrganizationUser(
    organizationSlug,
    organizationPath(locale, organizationSlug, "matches")
  );
  const season = await getActiveSeason(organization.id);
  const ladder = season ? await getLadder(season.id) : [];
  const matches = season
    ? await prisma.match.findMany({
        where: {
          organizationId: organization.id,
          seasonId: season.id,
        },
        include: { winner: true, loser: true, challenge: true },
        orderBy: matchFeedOrderBy,
        take: 30
      })
    : [];
  const acceptedChallenges = season && session
    ? await prisma.challenge.findMany({
        where: {
          organizationId: organization.id,
          seasonId: season.id,
          status: "Accepted",
          OR: [{ challengerId: session.sub }, { challengedId: session.sub }],
        },
        include: { challenger: true, challenged: true },
        orderBy: { createdAt: "desc" }
      })
    : [];
  const selectedChallenge =
    acceptedChallenges.find((challenge) => challenge.id === searchParams?.challengeId) ?? acceptedChallenges[0] ?? null;
  const usersForNames = [
    ...ladder.map((entry) => entry.user),
    ...matches.flatMap((match) => [match.winner, match.loser]),
    ...acceptedChallenges.flatMap((challenge) => [challenge.challenger, challenge.challenged])
  ];
  const publicNames = getPublicPlayerNames(uniqueUsers(usersForNames));
  const selectedChallengePlayers = selectedChallenge
    ? [selectedChallenge.challenger, selectedChallenge.challenged].map((player) => {
        const ladderEntry = ladder.find((entry) => entry.userId === player.id);

        return {
          id: player.id,
          label: publicNames.get(player.id) ?? player.username,
          detail: ladderEntry
            ? t(dictionary.matches.playerRankDetail, {
                rank: ladderEntry.currentRank,
                points: ladderEntry.points
              })
            : dictionary.matches.acceptedChallenge
        };
      })
    : [];

  const today = new Date().toISOString().slice(0, 10);

  return (
    <main className="page-shell">
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <section className="section-band">
          <p className="label">{dictionary.matches.label}</p>
          <h1 className="mt-1 text-3xl font-black">{dictionary.matches.heading}</h1>

          <div className="mt-6 grid gap-3">
            {matches.length === 0 ? (
              <EmptyState title={dictionary.matches.emptyTitle} body={dictionary.matches.emptyBody} />
            ) : (
              matches.map((match) => (
                <article key={match.id} className="rounded-lg border border-line bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-black">
                        {publicNames.get(match.winnerId) ?? match.winner.username} {match.winnerSets}-{match.loserSets}{" "}
                        {publicNames.get(match.loserId) ?? match.loser.username}
                      </p>
                      <p className="text-sm text-muted">{compactDate(match.playedAt, locale)}</p>
                    </div>
                    <div className="rounded-md bg-green-50 px-3 py-2 text-sm font-bold text-success">
                      +{match.winnerPointsAfter - match.winnerPointsBefore} / +
                      {match.loserPointsAfter - match.loserPointsBefore}
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-muted sm:grid-cols-2">
                    <p className="font-semibold text-success">
                      {t(dictionary.matches.winnerPoints, {
                        before: match.winnerPointsBefore,
                        after: match.winnerPointsAfter
                      })}
                    </p>
                    <p className="font-semibold text-court-700">
                      {t(dictionary.matches.loserPoints, {
                        before: match.loserPointsBefore,
                        after: match.loserPointsAfter
                      })}
                    </p>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <aside className="grid gap-4 self-start">
          <section className="section-band">
            <h2 className="text-xl font-black">{dictionary.matches.registerHeading}</h2>
            {acceptedChallenges.length === 0 ? (
              <div className="mt-4 rounded-lg border border-line bg-white p-4">
                <p className="text-sm font-semibold text-muted">{dictionary.matches.noAcceptedChallenges}</p>
                <Link className="button mt-4" href={organizationPath(locale, organizationSlug, "challenges")}>
                  {dictionary.matches.challengePlayer}
                </Link>
              </div>
            ) : (
              <>
                <div className="mt-4 grid gap-2">
                  <p className="label">{dictionary.matches.challengeLabel}</p>
                  <div className="grid gap-2">
                    {acceptedChallenges.map((challenge) => {
                      const isSelected = selectedChallenge?.id === challenge.id;

                      return (
                        <Link
                          key={challenge.id}
                          href={`${organizationPath(locale, organizationSlug, "matches")}?challengeId=${challenge.id}`}
                          className={isSelected ? "button" : "button-secondary"}
                        >
                          {publicNames.get(challenge.challengerId) ?? challenge.challenger.username}{" "}
                          {dictionary.matches.versus}{" "}
                          {publicNames.get(challenge.challengedId) ?? challenge.challenged.username}
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {selectedChallenge ? (
                  <form action={registerMatchResult} className="mt-4 grid gap-3">
                    <input type="hidden" name="organizationSlug" value={organizationSlug} />
                    <input type="hidden" name="seasonId" value={season?.id ?? ""} />
                    <input type="hidden" name="challengeId" value={selectedChallenge.id} />
                    <PlayerCombobox
                      name="winnerId"
                      label={dictionary.matches.winnerLabel}
                      players={selectedChallengePlayers}
                      disabled={!season || selectedChallengePlayers.length < 2}
                    />
                    <PlayerCombobox
                      name="loserId"
                      label={dictionary.matches.loserLabel}
                      players={selectedChallengePlayers}
                      disabled={!season || selectedChallengePlayers.length < 2}
                    />
                    <label className="grid gap-1">
                      <span className="label">{dictionary.matches.resultLabel}</span>
                      <select className="field" name="loserSets" required>
                        <option value="0">3-0</option>
                        <option value="1">3-1</option>
                        <option value="2">3-2</option>
                      </select>
                    </label>
                    <label className="grid gap-1">
                      <span className="label">{dictionary.matches.dateLabel}</span>
                      <input className="field" name="playedAt" type="date" defaultValue={today} />
                    </label>
                    <button className="button" type="submit" disabled={!season || selectedChallengePlayers.length < 2}>
                      {dictionary.matches.saveResult}
                    </button>
                  </form>
                ) : null}
              </>
            )}
          </section>

        </aside>
      </div>
    </main>
  );
}

function uniqueUsers<T extends { id: string }>(users: T[]) {
  return Array.from(new Map(users.map((user) => [user.id, user])).values());
}
