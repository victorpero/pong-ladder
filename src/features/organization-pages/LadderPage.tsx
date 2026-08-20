import Link from "next/link";
import { ActiveChallengeCards, type ActiveChallengeCard } from "@/components/ActiveChallengeCards";
import { EmptyState } from "@/components/EmptyState";
import { JoinSeasonToggle } from "@/components/JoinSeasonToggle";
import { StatCard } from "@/components/StatCard";
import { selectReportableChallenges } from "@/lib/active-challenges";
import { requireOrganizationUser } from "@/lib/authz";
import { getPublicPlayerNames } from "@/lib/display-name";
import { getSeasonLabel } from "@/lib/fixed-seasons";
import { compactDate, formatDate, formatNumber } from "@/lib/format";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";
import { plural, t } from "@/lib/i18n/format";
import { getRival } from "@/lib/player-stats";
import { prisma } from "@/lib/prisma";
import { getActiveSeason, getLadder, getPlayerMatches, getTeamLadder } from "@/lib/queries";
import { shouldShowSeasonJoinPrompt } from "@/lib/season-join-prompt";
import { getTeamDisplayName } from "@/lib/team-display";
import { organizationPath } from "@/lib/organization-paths";

export default async function OrganizationLadderPage({
  locale,
  organizationSlug
}: {
  locale: Locale;
  organizationSlug: string;
}) {
  const dictionary = getDictionary(locale);
  const { session, organization } = await requireOrganizationUser(
    organizationSlug,
    organizationPath(locale, organizationSlug, "ladder")
  );
  const season = await getActiveSeason(organization.id);

  if (!season) {
    return (
      <main className="page-shell">
        <EmptyState title={dictionary.ladder.noSeasonTitle} body={dictionary.ladder.noSeasonBody} />
      </main>
    );
  }

  const [ladder, teamLadder, viewerMatches, viewerChallenges] = await Promise.all([
    getLadder(season.id),
    getTeamLadder(season.id),
    session ? getPlayerMatches(session.sub, organization.id) : [],
    session ? getViewerActiveChallenges(organization.id, season.id, session.sub) : []
  ]);
  const currentPlayer = session ? ladder.find((entry) => entry.userId === session.sub) : null;
  const publicNames = getPublicPlayerNames([
    ...ladder.map((entry) => entry.user),
    ...viewerChallenges.flatMap((challenge) => [challenge.challenger, challenge.challenged])
  ]);
  // Contextual to whoever is signed in, so two players see the tag on different rows.
  const rivalId = session ? getRival(viewerMatches, session.sub)?.opponentId ?? null : null;
  // Kept in step with the toggle so the wrapper does not leave its margin behind.
  const showJoinPrompt = shouldShowSeasonJoinPrompt({
    joined: Boolean(currentPlayer),
    hasActiveSeason: Boolean(season)
  });
  const daysUntilNextSeason = getDaysUntilNextSeason(season.endsAt ?? season.startsAt);
  const seasonLabel = getSeasonLabel(season.year, season.seasonNumber);
  const activeChallengeCards = session
    ? selectReportableChallenges(viewerChallenges, session.sub).map((challenge) =>
        toActiveChallengeCard(challenge, session.sub, ladder, publicNames, {
          acceptedOn: (date) => t(dictionary.activeChallenges.acceptedOn, { date: compactDate(date, locale) }),
          rankDetail: (rank, points) => t(dictionary.matches.playerRankDetail, { rank, points })
        })
      )
    : [];

  return (
    <main className="page-shell">
      {session ? (
        <ActiveChallengeCards
          challenges={activeChallengeCards}
          defaultPlayedAt={new Date().toISOString().slice(0, 10)}
          organizationSlug={organizationSlug}
          seasonId={season.id}
          viewerId={session.sub}
        />
      ) : null}

      {showJoinPrompt ? (
        <section className="mb-6">
          <JoinSeasonToggle
            joined={Boolean(currentPlayer)}
            hasActiveSeason={Boolean(season)}
            organizationSlug={organizationSlug}
          />
        </section>
      ) : null}

      <section className="section-band">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="label">
              {dictionary.ladder.label} · {t(dictionary.ladder.seasonHeading, { season: seasonLabel })}
            </p>
            <h1 className="mt-1 text-3xl font-black sm:text-4xl">{dictionary.ladder.standingsHeading}</h1>
          </div>
          {/* The removed Players tab lives on here: the directory also covers members who have not joined the season. */}
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Link className="button-secondary" href={organizationPath(locale, organizationSlug, "players")}>
              {dictionary.ladder.playerDirectory}
            </Link>
            <Link className="button" href={organizationPath(locale, organizationSlug, "challenges")}>
              {dictionary.ladder.challengePlayer}
            </Link>
          </div>
        </div>

        {ladder.length === 0 ? (
          <EmptyState title={dictionary.ladder.emptyTitle} body={dictionary.ladder.emptyBody} />
        ) : (
          <div className="grid gap-3">
            {ladder.map((entry, index) => (
              <Link
                href={organizationPath(locale, organizationSlug, "players", entry.userId)}
                key={entry.id}
                className={`rank-in grid gap-3 rounded-lg border p-4 transition hover:-translate-y-0.5 hover:shadow-soft sm:grid-cols-[72px_1fr_90px_72px_72px_72px] ${getRankStyles(entry.effectivePosition).row}`}
                style={{ animationDelay: `${index * 35}ms` }}
              >
                <div>
                  <p className="stat-label">{dictionary.common.rank}</p>
                  <RankBadge rank={entry.effectivePosition} />
                </div>
                <div>
                  <p className="text-lg font-black">
                    {publicNames.get(entry.userId) ?? entry.user.username}
                    {entry.userId === rivalId ? (
                      <span className="ml-2 rounded-full bg-court-700 px-2 py-0.5 text-xs font-black align-middle text-white">
                        {dictionary.ladder.rivalBadge}
                      </span>
                    ) : null}
                  </p>
                  <p className="text-sm text-muted">{getTeamDisplayName(entry.user)}</p>
                </div>
                <Score label={dictionary.common.points} value={entry.points} locale={locale} strong />
                <Score label={dictionary.common.played} value={entry.matchesPlayed} locale={locale} />
                <Score label={dictionary.common.wins} value={entry.wins} locale={locale} tone="success" />
                <Score label={dictionary.common.losses} value={entry.losses} locale={locale} tone="danger" />
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="section-band mt-6">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="label">{dictionary.ladder.teamLadderLabel}</p>
            <h2 className="mt-1 text-2xl font-black">
              {t(dictionary.ladder.teamStandingsHeading, { season: seasonLabel })}
            </h2>
          </div>
          <Link className="button-secondary" href={organizationPath(locale, organizationSlug, "teams")}>
            {dictionary.ladder.manageTeams}
          </Link>
        </div>

        {teamLadder.length === 0 ? (
          <EmptyState title={dictionary.ladder.teamEmptyTitle} body={dictionary.ladder.teamEmptyBody} />
        ) : (
          <div className="grid gap-3">
            {teamLadder.map((team, index) => (
              <article
                key={team.id}
                className={`rank-in grid gap-3 rounded-lg border p-4 sm:grid-cols-[72px_1fr_90px_72px_72px_72px] ${getRankStyles(team.effectivePosition).row}`}
                style={{ animationDelay: `${index * 35}ms` }}
              >
                <div>
                  <p className="stat-label">{dictionary.common.rank}</p>
                  <RankBadge rank={team.effectivePosition} />
                </div>
                <div>
                  <p className="text-lg font-black">{team.name}</p>
                  <p className="text-sm text-muted">{plural(team.players, dictionary.ladder.teamPlayerCount)}</p>
                </div>
                <Score label={dictionary.common.points} value={team.points} locale={locale} strong />
                <Score label={dictionary.common.played} value={team.matchesPlayed} locale={locale} />
                <Score label={dictionary.common.wins} value={team.wins} locale={locale} tone="success" />
                <Score label={dictionary.common.losses} value={team.losses} locale={locale} tone="danger" />
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Season context is background reading, so it sits below the standings and the actions. */}
      <section className="mt-6 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="section-band">
          <p className="label">{dictionary.ladder.activeSeasonLabel}</p>
          <h2 className="mt-2 text-2xl font-black sm:text-3xl">
            {t(dictionary.ladder.seasonHeading, { season: seasonLabel })}
          </h2>
          <p className="mt-2 text-sm font-semibold text-muted">
            {t(dictionary.ladder.seasonRange, {
              start: formatDate(season.startsAt, locale),
              end: formatDate(season.endsAt ?? season.startsAt, locale)
            })}
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{dictionary.ladder.intro}</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <StatCard label={dictionary.ladder.players} value={formatNumber(ladder.length, locale)} />
          <StatCard label={dictionary.ladder.teams} value={formatNumber(teamLadder.length, locale)} />
          <StatCard
            label={dictionary.ladder.daysLeft}
            value={plural(daysUntilNextSeason, dictionary.ladder.dayCount)}
          />
        </div>
      </section>
    </main>
  );
}

/** Scoped to the viewer inside their own organization and active season. */
function getViewerActiveChallenges(organizationId: string, seasonId: string, viewerId: string) {
  return prisma.challenge.findMany({
    where: {
      organizationId,
      seasonId,
      status: "Accepted",
      OR: [{ challengerId: viewerId }, { challengedId: viewerId }]
    },
    include: { challenger: true, challenged: true },
    // Oldest acceptance first: the match that has been waiting longest is reported first.
    orderBy: { updatedAt: "asc" }
  });
}

type ViewerChallenge = Awaited<ReturnType<typeof getViewerActiveChallenges>>[number];

function toActiveChallengeCard(
  challenge: ViewerChallenge,
  viewerId: string,
  ladder: Array<{ userId: string; currentRank: number; points: number }>,
  publicNames: Map<string, string>,
  labels: { acceptedOn: (date: Date) => string; rankDetail: (rank: number, points: number) => string }
): ActiveChallengeCard {
  const opponent = challenge.challengerId === viewerId ? challenge.challenged : challenge.challenger;
  const ladderEntry = ladder.find((entry) => entry.userId === opponent.id);

  return {
    id: challenge.id,
    opponentId: opponent.id,
    opponentName: publicNames.get(opponent.id) ?? opponent.username,
    opponentDetail: ladderEntry ? labels.rankDetail(ladderEntry.currentRank, ladderEntry.points) : null,
    // An accepted challenge has acceptance as its last transition.
    acceptedLabel: labels.acceptedOn(challenge.updatedAt)
  };
}

function RankBadge({ rank }: { rank: number }) {
  return <p className={`inline-flex rounded-full px-3 py-1 text-2xl font-black ${getRankStyles(rank).badge}`}>#{rank}</p>;
}

function getRankStyles(rank: number) {
  if (rank === 1) {
    return {
      row: "border-amber-200 bg-amber-50 hover:border-amber-300",
      badge: "bg-amber-100 text-amber-800"
    };
  }

  if (rank === 2) {
    return {
      row: "border-slate-200 bg-slate-50 hover:border-slate-300",
      badge: "bg-slate-200 text-neutral"
    };
  }

  if (rank === 3) {
    return {
      row: "border-orange-200 bg-orange-50 hover:border-orange-300",
      badge: "bg-orange-100 text-orange-800"
    };
  }

  return {
    row: "border-line bg-white hover:border-slate-300",
    badge: "bg-slate-100 text-neutral"
  };
}

function Score({
  label,
  value,
  locale,
  strong,
  tone
}: {
  label: string;
  value: number;
  locale: Locale;
  strong?: boolean;
  tone?: "success" | "danger" | "neutral";
}) {
  const toneClass = tone === "success" ? "text-success" : tone === "danger" ? "text-court-700" : "text-ink";

  return (
    <div>
      <p className="stat-label">{label}</p>
      <p className={`${strong ? "text-2xl font-black" : "text-xl font-bold"} ${toneClass}`}>
        {formatNumber(value, locale)}
      </p>
    </div>
  );
}

function getDaysUntilNextSeason(nextSeasonStartsAt: Date) {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const remainingMilliseconds = nextSeasonStartsAt.getTime() - Date.now();

  return Math.max(0, Math.ceil(remainingMilliseconds / millisecondsPerDay));
}
