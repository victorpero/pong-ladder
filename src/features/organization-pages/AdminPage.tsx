import {
  ChallengeStatus,
  MembershipAuditAction,
  MembershipJoinMethod,
  MembershipRole,
  MembershipStatus,
  OrganizationJoinPolicy
} from "@prisma/client";
import { AddOrganizationMemberForm } from "@/components/AddOrganizationMemberForm";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { OrganizationPolicySettings } from "@/components/OrganizationPolicySettings";
import {
  adminCancelOpenChallengesForPlayer,
  adminDeleteChallenge,
  adminDeleteMatch,
  adminRemoveSeasonPlayer
} from "@/lib/admin-actions";
import { AddSeasonPlayerForm } from "@/app/[locale]/admin/AddSeasonPlayerForm";
import { requireOrganizationAdmin } from "@/lib/authz";
import { getPublicPlayerNames } from "@/lib/display-name";
import { getSeasonLabel } from "@/lib/fixed-seasons";
import { compactDate, formatNumber } from "@/lib/format";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary, type Dictionary } from "@/lib/i18n/dictionary";
import { plural, t } from "@/lib/i18n/format";
import { matchFeedOrderBy } from "@/lib/match-feed";
import {
  approveOrganizationMembership,
  changeOrganizationMembershipRole,
  reactivateOrganizationMembership,
  rejectOrganizationMembership,
  removeOrganizationMembership,
  suspendOrganizationMembership,
  transferOrganizationOwnership
} from "@/lib/membership-admin-actions";
import { canManageMembership } from "@/lib/membership-administration";
import { prisma } from "@/lib/prisma";
import { getActiveSeason, getLadder } from "@/lib/queries";
import { selectSeasonJoinCandidates } from "@/lib/season-membership";
import { getTeamDisplayName } from "@/lib/team-display";
import { organizationPath } from "@/lib/organization-paths";

export default async function OrganizationAdminPage({
  locale,
  organizationSlug
}: {
  locale: Locale;
  organizationSlug: string;
}) {
  const dictionary = getDictionary(locale);
  const { organization, membership } = await requireOrganizationAdmin(
    organizationSlug,
    organizationPath(locale, organizationSlug, "admin")
  );
  const season = await getActiveSeason(organization.id);
  const [
    ladder,
    organizationMemberships,
    matches,
    challenges,
    openChallenges,
    availableGlobalUsers,
    auditEvents
  ] = await Promise.all([
    getLadder(season.id),
    prisma.membership.findMany({
      where: { organizationId: organization.id },
      include: { user: true, team: true },
      orderBy: [{ status: "asc" }, { role: "asc" }, { user: { username: "asc" } }]
    }),
    prisma.match.findMany({
      where: { seasonId: season.id },
      include: { winner: true, loser: true, challenge: true },
      orderBy: matchFeedOrderBy
    }),
    prisma.challenge.findMany({
      where: { seasonId: season.id },
      include: { challenger: true, challenged: true, match: true },
      orderBy: { createdAt: "desc" }
    }),
    prisma.challenge.findMany({
      where: {
        organizationId: organization.id,
        status: { in: [ChallengeStatus.Pending, ChallengeStatus.Accepted] },
        match: null
      },
      select: { challengerId: true, challengedId: true }
    }),
    prisma.user.findMany({
      where: {
        emailVerifiedAt: { not: null },
        memberships: { none: { organizationId: organization.id } }
      },
      select: { id: true, username: true, fullName: true, email: true },
      orderBy: { username: "asc" },
      take: 100
    }),
    prisma.membershipAuditEvent.findMany({
      where: { organizationId: organization.id },
      include: {
        actorUser: { select: { id: true, username: true } },
        subjectUser: { select: { id: true, username: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 30
    })
  ]);
  const activeMemberships = organizationMemberships.filter(
    (organizationMembership) => organizationMembership.status === MembershipStatus.ACTIVE
  );
  const pendingMemberships = organizationMemberships.filter(
    (organizationMembership) => organizationMembership.status === MembershipStatus.PENDING
  );
  const users = activeMemberships.map((membership) => ({
    ...membership.user,
    team: membership.team,
    membershipRole: membership.role
  }));
  const pendingAccounts = pendingMemberships.map((membership) => ({
    ...membership.user,
    team: membership.team,
    requestedAt: membership.createdAt
  }));
  const openChallengeCounts = getChallengeCounts(openChallenges);
  const publicNames = getPublicPlayerNames(
    uniqueUsers([
      ...users,
      ...pendingAccounts,
      ...organizationMemberships.map((organizationMembership) => organizationMembership.user),
      ...ladder.map((entry) => entry.user),
      ...matches.flatMap((match) => [match.winner, match.loser]),
      ...challenges.flatMap((challenge) => [challenge.challenger, challenge.challenged])
    ])
  );
  const seasonLabel = getSeasonLabel(season.year, season.seasonNumber);
  const seasonJoinCandidates = selectSeasonJoinCandidates(
    users,
    ladder.map((entry) => entry.userId)
  ).map((user) => ({
    id: user.id,
    label: `${publicNames.get(user.id) ?? user.username} (${user.username})`,
    detail: getTeamDisplayName(user)
  }));
  const organizationJoinCandidates = availableGlobalUsers.map((candidate) => ({
    id: candidate.id,
    label: `${candidate.fullName} (${candidate.username})`,
    detail: candidate.email
  }));

  return (
    <main className="page-shell">
      <section className="mb-6 grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
        <div className="section-band">
          <p className="label">{dictionary.admin.label}</p>
          <h1 className="mt-1 text-3xl font-black">{dictionary.admin.heading}</h1>
          <p className="mt-2 text-sm text-muted">{t(dictionary.admin.seasonLine, { season: seasonLabel })}</p>
        </div>
        <AdminStat label={dictionary.admin.seasonPlayers} value={formatNumber(ladder.length, locale)} />
        <AdminStat
          label={dictionary.admin.organizationMembers}
          value={formatNumber(organizationMemberships.length, locale)}
        />
        <AdminStat label={dictionary.admin.matches} value={formatNumber(matches.length, locale)} />
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        {membership.role === MembershipRole.OWNER ? (
          <OrganizationPolicySettings
            organizationSlug={organization.slug}
            organizationName={organization.name}
            organizationType={organization.type}
            visibility={organization.visibility}
            joinPolicy={organization.joinPolicy}
            allowedEmailDomains={organization.allowedEmailDomains}
            defaultLocale={organization.defaultLocale}
          />
        ) : null}

        {organization.joinPolicy === OrganizationJoinPolicy.ADMIN_APPROVAL ? (
        <section className="section-band">
          <div className="mb-4">
            <p className="label">{dictionary.admin.approvalsLabel}</p>
            <h2 className="mt-1 text-2xl font-black">{dictionary.admin.pendingAccountsHeading}</h2>
          </div>
          <div className="grid gap-3">
            {pendingAccounts.length === 0 ? (
              <EmptyState title={dictionary.admin.pendingEmptyTitle} body={dictionary.admin.pendingEmptyBody} />
            ) : (
              pendingAccounts.map((user) => (
                <article key={user.id} className="rounded-lg border border-line bg-white p-4">
                  <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
                    <div>
                      <p className="font-black">{publicNames.get(user.id) ?? user.username}</p>
                      <p className="text-sm text-muted">{user.email}</p>
                      <p className="mt-1 text-sm font-semibold text-muted">
                        {t(dictionary.admin.requestedAt, {
                          username: user.username,
                          date: compactDate(user.requestedAt, locale)
                        })}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 md:justify-end">
                      <form action={approveOrganizationMembership}>
                        <input type="hidden" name="organizationSlug" value={organizationSlug} />
                        <input type="hidden" name="userId" value={user.id} />
                        <button className="button" type="submit">
                          {dictionary.admin.approve}
                        </button>
                      </form>
                      <form action={rejectOrganizationMembership}>
                        <input type="hidden" name="organizationSlug" value={organizationSlug} />
                        <input type="hidden" name="userId" value={user.id} />
                        <ConfirmSubmitButton
                          className="button-danger"
                          confirmation={dictionary.admin.declinePendingConfirmation}
                        >
                          {dictionary.admin.declinePending}
                        </ConfirmSubmitButton>
                      </form>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
        ) : null}

        <section className="section-band">
          <div className="mb-4">
            <p className="label">{dictionary.admin.organizationMembershipLabel}</p>
            <h2 className="mt-1 text-2xl font-black">{dictionary.admin.addExistingHeading}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{dictionary.admin.addExistingBody}</p>
          </div>
          {organizationJoinCandidates.length === 0 ? (
            <EmptyState title={dictionary.admin.noAccountsTitle} body={dictionary.admin.noAccountsBody} />
          ) : (
            <AddOrganizationMemberForm organizationSlug={organizationSlug} users={organizationJoinCandidates} />
          )}
        </section>

        <section className="section-band">
          <div className="mb-4">
            <p className="label">{dictionary.admin.seasonMembershipLabel}</p>
            <h2 className="mt-1 text-2xl font-black">{dictionary.admin.addSeasonPlayerHeading}</h2>
            <p className="mt-2 text-sm text-muted">
              {t(dictionary.admin.addSeasonPlayerBody, { season: seasonLabel })}
            </p>
          </div>
          {seasonJoinCandidates.length === 0 ? (
            <EmptyState title={dictionary.admin.everyoneJoinedTitle} body={dictionary.admin.everyoneJoinedBody} />
          ) : (
            <AddSeasonPlayerForm
              seasonId={season.id}
              players={seasonJoinCandidates}
              organizationSlug={organizationSlug}
            />
          )}
        </section>

        <section className="section-band">
          <div className="mb-4">
            <p className="label">{dictionary.admin.seasonMembershipLabel}</p>
            <h2 className="mt-1 text-2xl font-black">{dictionary.admin.removeSeasonPlayersHeading}</h2>
          </div>
          <div className="grid gap-3">
            {ladder.length === 0 ? (
              <EmptyState title={dictionary.admin.noSeasonPlayersTitle} body={dictionary.admin.noSeasonPlayersBody} />
            ) : (
              ladder.map((entry) => (
                <article key={entry.id} className="rounded-lg border border-line bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-black">
                        #{entry.currentRank} {publicNames.get(entry.userId) ?? entry.user.username}
                      </p>
                      <p className="text-sm text-muted">
                        {t(dictionary.admin.seasonPlayerDetail, {
                          points: entry.points,
                          team: getTeamDisplayName(entry.user)
                        })}
                      </p>
                    </div>
                    <form action={adminRemoveSeasonPlayer}>
                      <input type="hidden" name="organizationSlug" value={organizationSlug} />
                      <input type="hidden" name="seasonPlayerId" value={entry.id} />
                      <ConfirmSubmitButton
                        className="button-danger"
                        confirmation={dictionary.admin.removeSeasonPlayerConfirmation}
                      >
                        {dictionary.common.remove}
                      </ConfirmSubmitButton>
                    </form>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="section-band">
          <div className="mb-4">
            <p className="label">{dictionary.admin.organizationMembershipLabel}</p>
            <h2 className="mt-1 text-2xl font-black">{dictionary.admin.memberAdministrationHeading}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{dictionary.admin.memberAdministrationBody}</p>
          </div>
          <div className="grid gap-3">
            {organizationMemberships.map((organizationMembership) => {
              const user = organizationMembership.user;
              const openChallengeCount = openChallengeCounts.get(user.id) ?? 0;
              const actorCanManage = canManageMembership(membership.role, organizationMembership.role);
              const canChangeRole =
                membership.role === MembershipRole.OWNER &&
                organizationMembership.status === MembershipStatus.ACTIVE &&
                organizationMembership.role !== MembershipRole.OWNER;
              const canTransferOwnership =
                canChangeRole && organizationMembership.userId !== membership.userId;

              return (
                <article key={organizationMembership.id} className="rounded-lg border border-line bg-white p-4">
                  <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-black">{publicNames.get(user.id) ?? user.username}</p>
                        <span className={membershipStatusClassName(organizationMembership.status)}>
                          {dictionary.admin.membershipStatus[organizationMembership.status]}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-muted">
                          {dictionary.admin.membershipRole[organizationMembership.role]}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted">
                        {t(dictionary.admin.joinedVia, {
                          email: user.email,
                          method: joinMethodLabel(dictionary, organizationMembership.joinMethod)
                        })}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-muted">
                        {t(dictionary.admin.memberDetail, {
                          username: user.username,
                          team: getTeamDisplayName({ ...user, team: organizationMembership.team }),
                          challenges: plural(openChallengeCount, dictionary.admin.openChallengeCount)
                        })}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 md:justify-end">
                      {organizationMembership.status === MembershipStatus.ACTIVE && actorCanManage ? (
                        <>
                          <form action={adminCancelOpenChallengesForPlayer}>
                            <input type="hidden" name="organizationSlug" value={organizationSlug} />
                            <input type="hidden" name="userId" value={user.id} />
                            <ConfirmSubmitButton
                              className="button-secondary"
                              confirmation={dictionary.admin.cancelOpenChallengesConfirmation}
                              disabled={openChallengeCount === 0}
                            >
                              {dictionary.admin.cancelOpenChallenges}
                            </ConfirmSubmitButton>
                          </form>
                          <form action={suspendOrganizationMembership}>
                            <input type="hidden" name="organizationSlug" value={organizationSlug} />
                            <input type="hidden" name="userId" value={user.id} />
                            <ConfirmSubmitButton
                              className="button-secondary"
                              confirmation={dictionary.admin.suspendConfirmation}
                            >
                              {dictionary.admin.suspend}
                            </ConfirmSubmitButton>
                          </form>
                          <form action={removeOrganizationMembership}>
                            <input type="hidden" name="organizationSlug" value={organizationSlug} />
                            <input type="hidden" name="userId" value={user.id} />
                            <ConfirmSubmitButton
                              className="button-danger"
                              confirmation={dictionary.admin.removeMemberConfirmation}
                            >
                              {dictionary.admin.removeMember}
                            </ConfirmSubmitButton>
                          </form>
                        </>
                      ) : null}
                      {(organizationMembership.status === MembershipStatus.SUSPENDED ||
                        organizationMembership.status === MembershipStatus.REJECTED ||
                        organizationMembership.status === MembershipStatus.REMOVED) &&
                      actorCanManage ? (
                        <form action={reactivateOrganizationMembership}>
                          <input type="hidden" name="organizationSlug" value={organizationSlug} />
                          <input type="hidden" name="userId" value={user.id} />
                          <ConfirmSubmitButton
                            className="button"
                            confirmation={dictionary.admin.reactivateConfirmation}
                          >
                            {dictionary.admin.reactivate}
                          </ConfirmSubmitButton>
                        </form>
                      ) : null}
                      {canChangeRole ? (
                        <form action={changeOrganizationMembershipRole}>
                          <input type="hidden" name="organizationSlug" value={organizationSlug} />
                          <input type="hidden" name="userId" value={user.id} />
                          <input
                            type="hidden"
                            name="role"
                            value={
                              organizationMembership.role === MembershipRole.ADMIN
                                ? MembershipRole.PLAYER
                                : MembershipRole.ADMIN
                            }
                          />
                          <ConfirmSubmitButton
                            className="button-secondary"
                            confirmation={
                              organizationMembership.role === MembershipRole.ADMIN
                                ? dictionary.admin.revokeAdminConfirmation
                                : dictionary.admin.grantAdminConfirmation
                            }
                          >
                            {organizationMembership.role === MembershipRole.ADMIN
                              ? dictionary.admin.makePlayer
                              : dictionary.admin.makeAdmin}
                          </ConfirmSubmitButton>
                        </form>
                      ) : null}
                      {canTransferOwnership ? (
                        <form action={transferOrganizationOwnership}>
                          <input type="hidden" name="organizationSlug" value={organizationSlug} />
                          <input type="hidden" name="userId" value={user.id} />
                          <ConfirmSubmitButton
                            className="button-danger"
                            confirmation={dictionary.admin.transferOwnershipConfirmation}
                          >
                            {dictionary.admin.transferOwnership}
                          </ConfirmSubmitButton>
                        </form>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="section-band">
          <div className="mb-4">
            <p className="label">{dictionary.admin.auditLabel}</p>
            <h2 className="mt-1 text-2xl font-black">{dictionary.admin.auditHeading}</h2>
          </div>
          <div className="grid gap-3">
            {auditEvents.length === 0 ? (
              <EmptyState title={dictionary.admin.auditEmptyTitle} body={dictionary.admin.auditEmptyBody} />
            ) : (
              auditEvents.map((event) => (
                <article key={event.id} className="rounded-lg border border-line bg-white p-4">
                  <p className="font-black">
                    {event.subjectUser.username} · {auditActionLabel(dictionary, event.action)}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {t(dictionary.admin.auditActor, {
                      actor: event.actorUser?.username ?? dictionary.admin.auditSystemActor,
                      date: compactDate(event.createdAt, locale)
                    })}
                  </p>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="section-band">
          <div className="mb-4">
            <p className="label">{dictionary.admin.matchesLabel}</p>
            <h2 className="mt-1 text-2xl font-black">{dictionary.admin.deleteMatchesHeading}</h2>
          </div>
          <div className="grid gap-3">
            {matches.length === 0 ? (
              <EmptyState title={dictionary.admin.noMatchesTitle} body={dictionary.admin.noMatchesBody} />
            ) : (
              matches.map((match) => (
                <article key={match.id} className="rounded-lg border border-line bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-black">
                        {publicNames.get(match.winnerId) ?? match.winner.username} {match.winnerSets}-{match.loserSets}{" "}
                        {publicNames.get(match.loserId) ?? match.loser.username}
                      </p>
                      <p className="text-sm text-muted">
                        {compactDate(match.playedAt, locale)}
                        {match.challenge ? ` · ${dictionary.admin.linkedChallenge}` : ""}
                      </p>
                    </div>
                    <form action={adminDeleteMatch}>
                      <input type="hidden" name="organizationSlug" value={organizationSlug} />
                      <input type="hidden" name="matchId" value={match.id} />
                      <ConfirmSubmitButton
                        className="button-danger"
                        confirmation={dictionary.admin.deleteMatchConfirmation}
                      >
                        {dictionary.common.delete}
                      </ConfirmSubmitButton>
                    </form>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="section-band">
          <div className="mb-4">
            <p className="label">{dictionary.admin.challengesLabel}</p>
            <h2 className="mt-1 text-2xl font-black">{dictionary.admin.deleteChallengesHeading}</h2>
          </div>
          <div className="grid gap-3">
            {challenges.length === 0 ? (
              <EmptyState title={dictionary.admin.noChallengesTitle} body={dictionary.admin.noChallengesBody} />
            ) : (
              challenges.map((challenge) => (
                <article key={challenge.id} className="rounded-lg border border-line bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-black">
                        {publicNames.get(challenge.challengerId) ?? challenge.challenger.username}{" "}
                        {dictionary.matches.versus}{" "}
                        {publicNames.get(challenge.challengedId) ?? challenge.challenged.username}
                      </p>
                      <p className="mt-1 text-sm text-muted">{compactDate(challenge.createdAt, locale)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={challenge.status} locale={locale} />
                      <form action={adminDeleteChallenge}>
                        <input type="hidden" name="organizationSlug" value={organizationSlug} />
                        <input type="hidden" name="challengeId" value={challenge.id} />
                        <ConfirmSubmitButton
                          className="button-danger"
                          confirmation={dictionary.admin.deleteChallengeConfirmation}
                        >
                          {dictionary.common.delete}
                        </ConfirmSubmitButton>
                      </form>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function AdminStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="section-band">
      <p className="stat-label">{label}</p>
      <p className="mt-2 text-3xl font-black text-court-700">{value}</p>
    </div>
  );
}

function uniqueUsers<T extends { id: string }>(users: T[]) {
  return Array.from(new Map(users.map((user) => [user.id, user])).values());
}

function getChallengeCounts(challenges: Array<{ challengerId: string; challengedId: string }>) {
  const counts = new Map<string, number>();

  for (const challenge of challenges) {
    counts.set(challenge.challengerId, (counts.get(challenge.challengerId) ?? 0) + 1);
    counts.set(challenge.challengedId, (counts.get(challenge.challengedId) ?? 0) + 1);
  }

  return counts;
}

function membershipStatusClassName(status: MembershipStatus) {
  const color =
    status === MembershipStatus.ACTIVE
      ? "bg-green-50 text-success"
      : status === MembershipStatus.PENDING
        ? "bg-amber-50 text-amber-800"
        : "bg-red-50 text-danger";

  return `rounded-full px-2.5 py-1 text-xs font-black ${color}`;
}

function joinMethodLabel(dictionary: Dictionary, joinMethod: MembershipJoinMethod) {
  return dictionary.admin.joinMethod[joinMethod];
}

function auditActionLabel(dictionary: Dictionary, action: MembershipAuditAction) {
  return dictionary.admin.auditAction[action];
}
