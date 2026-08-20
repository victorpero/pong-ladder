import { notFound } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";
import { PlayerCombobox } from "@/components/PlayerCombobox";
import { StatusBadge } from "@/components/StatusBadge";
import { StatCard } from "@/components/StatCard";
import { createChallenge } from "@/lib/actions";
import { requireOrganizationUser } from "@/lib/authz";
import {
  activeChallengesForPlayerWhere,
  canChallengePlayer,
  getActiveChallengeOpponentIds,
  splitActiveChallengeTargets
} from "@/lib/challenge-rules";
import { getPublicPlayerName, getPublicPlayerNames } from "@/lib/display-name";
import { getSeasonLabel } from "@/lib/fixed-seasons";
import { compactDate, formatNumber } from "@/lib/format";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";
import { t } from "@/lib/i18n/format";
import { sortByRegistration } from "@/lib/match-feed";
import { PlayerStats } from "@/components/PlayerStats";
import { buildHeadToHead, filterSeasonMatches, selectRival, summarizeRecord } from "@/lib/player-stats";
import { prisma } from "@/lib/prisma";
import { getActiveSeason, getLadder, getPlayerMatches } from "@/lib/queries";
import { getTeamDisplayName } from "@/lib/team-display";
import { organizationPath } from "@/lib/organization-paths";

export default async function OrganizationPlayerPage({
  locale,
  organizationSlug,
  playerId
}: {
  locale: Locale;
  organizationSlug: string;
  playerId: string;
}) {
  const dictionary = getDictionary(locale);
  const { session, organization } = await requireOrganizationUser(
    organizationSlug,
    organizationPath(locale, organizationSlug, "players", playerId)
  );
  const [rawUser, season] = await Promise.all([
    prisma.user.findFirst({
      where: {
        id: playerId,
        memberships: { some: { organizationId: organization.id, status: "ACTIVE" } }
      },
      include: { memberships: { where: { organizationId: organization.id }, include: { team: true } } }
    }),
    getActiveSeason(organization.id)
  ]);

  if (!rawUser) {
    notFound();
  }
  const user = { ...rawUser, team: rawUser.memberships[0]?.team ?? null };

  const ladder = season ? await getLadder(season.id) : [];
  const entry = ladder.find((item) => item.userId === user.id);
  const currentPlayer = session ? ladder.find((item) => item.userId === session.sub) : null;
  const challengeTargets = currentPlayer
    ? ladder.filter((item) => item.userId !== currentPlayer.userId && canChallengePlayer(currentPlayer, item))
    : [];
  const activeChallengesForViewer =
    season && currentPlayer
      ? await prisma.challenge.findMany({
          where: { organizationId: organization.id, ...activeChallengesForPlayerWhere(season.id, currentPlayer.userId) },
          select: { challengerId: true, challengedId: true, status: true }
        })
      : [];

  const [allMatches, challenges] = season
    ? await Promise.all([
        getPlayerMatches(user.id, organization.id),
        prisma.challenge.findMany({
          where: {
            organizationId: organization.id,
            seasonId: season.id,
            OR: [{ challengerId: user.id }, { challengedId: user.id }]
          },
          include: { challenger: true, challenged: true },
          orderBy: { createdAt: "desc" },
          take: 8
        })
      ])
    : [[], []];
  const publicNames = getPublicPlayerNames(
    uniqueUsers([
      user,
      ...ladder.map((item) => item.user),
      ...allMatches.flatMap((match) => [match.winner, match.loser]),
      ...challenges.flatMap((challenge) => [challenge.challenger, challenge.challenged])
    ])
  );
  const seasonMatches = season ? filterSeasonMatches(allMatches, season.id) : [];
  const matches = sortByRegistration(seasonMatches).slice(0, 12);
  const allTimeRecord = summarizeRecord(allMatches, user.id);
  const seasonRecord = summarizeRecord(seasonMatches, user.id);
  const headToHead = buildHeadToHead(allMatches, user.id, publicNames);
  const rival = selectRival(headToHead);
  const seasonLabel = season ? getSeasonLabel(season.year, season.seasonNumber) : "";
  const publicName = publicNames.get(user.id) ?? getPublicPlayerName(user);
  const currentPlayerName = currentPlayer
    ? publicNames.get(currentPlayer.userId) ?? currentPlayer.user.username
    : session?.username ?? "";
  const { availableTargets: availableChallengeTargets, blockedTargets: blockedActiveTargets } = splitActiveChallengeTargets(
    challengeTargets,
    currentPlayer ? getActiveChallengeOpponentIds(activeChallengesForViewer, currentPlayer.userId) : []
  );
  const challengeOptions = availableChallengeTargets.map((item) => ({
    id: item.userId,
    label: `${publicNames.get(item.userId) ?? item.user.username} (#${item.effectivePosition})`,
    detail: t(dictionary.matches.playerRankDetail, { rank: item.effectivePosition, points: item.points })
  }));
  const defaultChallengeTargetId = availableChallengeTargets.some((item) => item.userId === user.id) ? user.id : undefined;

  return (
    <main className="page-shell">
      <section className="mb-6 grid gap-4 md:grid-cols-[1fr_1fr_1fr]">
        <StatCard
          label={dictionary.common.rank}
          value={entry ? `#${entry.effectivePosition}` : dictionary.common.notAvailable}
        />
        <StatCard label={dictionary.common.points} value={formatNumber(entry?.points ?? 0, locale)} />
        <StatCard label={dictionary.common.record} value={entry ? `${entry.wins}-${entry.losses}` : "0-0"} />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="section-band">
          <p className="label">{dictionary.player.label}</p>
          <h1 className="mt-1 text-3xl font-black">{publicName}</h1>
          <p className="mt-1 text-sm text-muted">{getTeamDisplayName(user)}</p>

          <div className="mt-8">
            <PlayerStats
              locale={locale}
              seasonLabel={seasonLabel}
              seasonRecord={seasonRecord}
              allTimeRecord={allTimeRecord}
              headToHead={headToHead}
              rival={rival}
              emptyHeadToHeadBody={dictionary.player.headToHeadEmptyBody}
            />
          </div>

          <h2 className="mt-8 text-xl font-black">{dictionary.player.matchHistoryHeading}</h2>
          <div className="mt-4 grid gap-3">
            {matches.length === 0 ? (
              <EmptyState title={dictionary.player.emptyMatchesTitle} body={dictionary.player.emptyMatchesBody} />
            ) : (
              matches.map((match) => (
                <div key={match.id} className="rounded-lg border border-line bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-bold">
                      {t(dictionary.player.beatSummary, {
                        winner: publicNames.get(match.winnerId) ?? match.winner.username,
                        loser: publicNames.get(match.loserId) ?? match.loser.username,
                        winnerSets: match.winnerSets,
                        loserSets: match.loserSets
                      })}
                    </p>
                    <p className="text-sm text-muted">{compactDate(match.playedAt, locale)}</p>
                  </div>
                  <p className="mt-2 text-sm text-muted">
                    {match.winnerPointsBefore} {"->"} {match.winnerPointsAfter} / {match.loserPointsBefore} {"->"}{" "}
                    {match.loserPointsAfter}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        <aside className="grid gap-4 self-start">
          <section className="section-band">
            <h2 className="text-xl font-black">{dictionary.player.challengeActionsHeading}</h2>
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
                  label={dictionary.player.challengeLabel}
                  players={challengeOptions}
                  defaultPlayerId={defaultChallengeTargetId}
                  disabled={challengeOptions.length === 0}
                />
                <button className="button" type="submit" disabled={challengeOptions.length === 0}>
                  {dictionary.challenges.createButton}
                </button>
                {blockedActiveTargets.length > 0 ? (
                  <p className="rounded-md border border-line bg-slate-50 p-3 text-sm font-semibold text-muted">
                    {t(dictionary.challenges.blockedTargets, {
                      players: blockedActiveTargets
                        .map((item) => publicNames.get(item.userId) ?? item.user.username)
                        .join(", ")
                    })}
                  </p>
                ) : null}
              </form>
            )}
          </section>

          <section className="section-band">
            <h2 className="text-xl font-black">{dictionary.player.challengeHistoryHeading}</h2>
            <div className="mt-4 grid gap-3">
              {challenges.length === 0 ? (
                <p className="text-sm text-muted">{dictionary.player.noChallengeHistory}</p>
              ) : (
                challenges.map((challenge) => (
                  <div key={challenge.id} className="rounded-lg border border-line bg-white p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold">
                        {publicNames.get(challenge.challengerId) ?? challenge.challenger.username} {"->"}{" "}
                        {publicNames.get(challenge.challengedId) ?? challenge.challenged.username}
                      </p>
                      <StatusBadge status={challenge.status} locale={locale} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}

function uniqueUsers<T extends { id: string }>(users: T[]) {
  return Array.from(new Map(users.map((user) => [user.id, user])).values());
}
