import { redirect } from "next/navigation";
import { ChangePasswordForm } from "@/app/[locale]/account/ChangePasswordForm";
import { ChangeEmailForm } from "@/app/[locale]/account/ChangeEmailForm";
import { LinkedAccounts } from "@/app/[locale]/account/LinkedAccounts";
import { EmptyState } from "@/components/EmptyState";
import { PlayerStats } from "@/components/PlayerStats";
import { StatusBadge } from "@/components/StatusBadge";
import { StatCard } from "@/components/StatCard";
import { requireOrganizationUser } from "@/lib/authz";
import { googleAuthEnabled } from "@/lib/auth";
import { getPublicPlayerName, getPublicPlayerNames } from "@/lib/display-name";
import { getSeasonLabel } from "@/lib/fixed-seasons";
import { compactDate, formatDate, formatNumber } from "@/lib/format";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";
import { t } from "@/lib/i18n/format";
import { sortByRegistration } from "@/lib/match-feed";
import { buildHeadToHead, filterSeasonMatches, selectRival, summarizeRecord } from "@/lib/player-stats";
import { prisma } from "@/lib/prisma";
import { getActiveSeason, getLadder, getPlayerMatches } from "@/lib/queries";
import { organizationPath } from "@/lib/organization-paths";

export default async function OrganizationAccountPage({
  locale,
  organizationSlug
}: {
  locale: Locale;
  organizationSlug: string;
}) {
  const dictionary = getDictionary(locale);
  const { session, organization } = await requireOrganizationUser(
    organizationSlug,
    organizationPath(locale, organizationSlug, "account")
  );

  const [user, season, authAccounts] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.sub }
    }),
    getActiveSeason(organization.id),
    prisma.account.findMany({
      where: { userId: session.sub },
      select: { providerId: true }
    })
  ]);

  if (!user) {
    redirect("/logout");
  }

  const ladder = season ? await getLadder(season.id) : [];
  const entry = ladder.find((item) => item.userId === user.id);

  const [allMatches, challenges] = season
    ? await Promise.all([
        getPlayerMatches(user.id, organization.id),
        prisma.challenge.findMany({
          where: {
            organizationId: organization.id,
            seasonId: season.id,
            OR: [{ challengerId: user.id }, { challengedId: user.id }],
          },
          include: { challenger: true, challenged: true },
          orderBy: { createdAt: "desc" },
          take: 6
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
  const matches = sortByRegistration(seasonMatches).slice(0, 6);
  const allTimeRecord = summarizeRecord(allMatches, user.id);
  const seasonRecord = summarizeRecord(seasonMatches, user.id);
  const headToHead = buildHeadToHead(allMatches, user.id, publicNames);
  const rival = selectRival(headToHead);
  const seasonLabel = season ? getSeasonLabel(season.year, season.seasonNumber) : "";
  const publicName = publicNames.get(user.id) ?? getPublicPlayerName(user);
  const hasPassword = authAccounts.some((account) => account.providerId === "credential");

  return (
    <main className="page-shell">
      <section className="mb-6 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="section-band">
          <p className="label">{dictionary.account.label}</p>
          <h1 className="mt-1 text-3xl font-black">{publicName}</h1>
          <p className="mt-2 text-sm text-muted">{user.email}</p>
          <p className="mt-1 text-sm text-muted">{t(dictionary.account.fullName, { name: user.fullName })}</p>
          <p className="mt-4 text-sm text-muted">
            {t(dictionary.account.createdAt, { date: formatDate(user.createdAt, locale) })}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            label={dictionary.common.rank}
            value={entry ? `#${entry.effectivePosition}` : dictionary.common.notAvailable}
          />
          <StatCard label={dictionary.common.points} value={formatNumber(entry?.points ?? 0, locale)} />
          <StatCard label={dictionary.common.record} value={entry ? `${entry.wins}-${entry.losses}` : "0-0"} />
        </div>
      </section>

      <section className="section-band mb-6">
        <p className="label">{dictionary.account.statisticsLabel}</p>
        <div className="mt-4">
          <PlayerStats
            locale={locale}
            seasonLabel={seasonLabel}
            seasonRecord={seasonRecord}
            allTimeRecord={allTimeRecord}
            headToHead={headToHead}
            rival={rival}
            emptyHeadToHeadBody={dictionary.account.headToHeadEmptyBody}
          />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="section-band">
          <div className="mb-4">
            <p className="label">{dictionary.account.securityLabel}</p>
            <h2 className="mt-1 text-2xl font-black">{dictionary.account.changePasswordHeading}</h2>
          </div>
          {hasPassword ? (
            <ChangePasswordForm />
          ) : (
            <p className="text-sm leading-6 text-muted">{dictionary.account.externalProviderOnly}</p>
          )}
        </section>

        <section className="section-band">
          <div className="mb-4">
            <p className="label">{dictionary.account.identityLabel}</p>
            <h2 className="mt-1 text-2xl font-black">{dictionary.account.changeEmailHeading}</h2>
          </div>
          <ChangeEmailForm />
        </section>

        {googleAuthEnabled ? (
          <section className="section-band">
            <div className="mb-4">
              <p className="label">{dictionary.account.signInMethodsLabel}</p>
              <h2 className="mt-1 text-2xl font-black">{dictionary.account.linkedAccountsHeading}</h2>
            </div>
            <LinkedAccounts googleLinked={authAccounts.some((account) => account.providerId === "google")} />
          </section>
        ) : null}

        <section className="section-band">
          <div className="mb-4">
            <p className="label">{dictionary.account.recentMatchesLabel}</p>
            <h2 className="mt-1 text-2xl font-black">{dictionary.account.matchHistoryHeading}</h2>
          </div>
          <div className="grid gap-3">
            {matches.length === 0 ? (
              <EmptyState title={dictionary.account.emptyMatchesTitle} body={dictionary.account.emptyMatchesBody} />
            ) : (
              matches.map((match) => {
                const won = match.winnerId === user.id;

                return (
                  <article key={match.id} className="rounded-lg border border-line bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-black">
                        {won ? dictionary.account.win : dictionary.account.loss} {dictionary.account.versus}{" "}
                        {publicNames.get(won ? match.loserId : match.winnerId) ??
                          (won ? match.loser.username : match.winner.username)}
                      </p>
                      <p className="text-sm text-muted">{compactDate(match.playedAt, locale)}</p>
                    </div>
                    <p className="mt-2 text-sm text-muted">
                      {t(dictionary.account.matchSummary, {
                        winner: publicNames.get(match.winnerId) ?? match.winner.username,
                        winnerSets: match.winnerSets,
                        loserSets: match.loserSets
                      })}
                    </p>
                  </article>
                );
              })
            )}
          </div>
        </section>

        <section className="section-band">
          <div className="mb-4">
            <p className="label">{dictionary.account.challengesLabel}</p>
            <h2 className="mt-1 text-2xl font-black">{dictionary.account.challengeActivityHeading}</h2>
          </div>
          <div className="grid gap-3">
            {challenges.length === 0 ? (
              <EmptyState
                title={dictionary.account.emptyChallengesTitle}
                body={dictionary.account.emptyChallengesBody}
              />
            ) : (
              challenges.map((challenge) => (
                <article key={challenge.id} className="rounded-lg border border-line bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-black">
                      {publicNames.get(challenge.challengerId) ?? challenge.challenger.username}{" "}
                      {dictionary.account.versus}{" "}
                      {publicNames.get(challenge.challengedId) ?? challenge.challenged.username}
                    </p>
                    <StatusBadge status={challenge.status} locale={locale} />
                  </div>
                  <p className="mt-2 text-sm text-muted">{compactDate(challenge.createdAt, locale)}</p>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function uniqueUsers<T extends { id: string }>(users: T[]) {
  return Array.from(new Map(users.map((user) => [user.id, user])).values());
}
