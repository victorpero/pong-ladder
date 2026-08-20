import { ChallengeStatus, MembershipRole, MembershipStatus, OrganizationJoinPolicy } from "@prisma/client";
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
import { AddSeasonPlayerForm } from "@/app/admin/AddSeasonPlayerForm";
import { requireOrganizationAdmin } from "@/lib/authz";
import { getPublicPlayerNames } from "@/lib/display-name";
import { getSeasonLabel } from "@/lib/fixed-seasons";
import { compactDate } from "@/lib/format";
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

export default async function OrganizationAdminPage({ organizationSlug }: { organizationSlug: string }) {
  const { organization, membership } = await requireOrganizationAdmin(
    organizationSlug,
    organizationPath(organizationSlug, "admin")
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
          <p className="label">Admin</p>
          <h1 className="mt-1 text-3xl font-black">Root controls</h1>
          <p className="mt-2 text-sm text-muted">Season {seasonLabel}</p>
        </div>
        <AdminStat label="Season players" value={ladder.length} />
        <AdminStat label="Organization members" value={organizationMemberships.length} />
        <AdminStat label="Matches" value={matches.length} />
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
          />
        ) : null}

        {organization.joinPolicy === OrganizationJoinPolicy.ADMIN_APPROVAL ? (
        <section className="section-band">
          <div className="mb-4">
            <p className="label">Approvals</p>
            <h2 className="mt-1 text-2xl font-black">Pending accounts</h2>
          </div>
          <div className="grid gap-3">
            {pendingAccounts.length === 0 ? (
              <EmptyState title="No pending accounts" body="New account requests will appear here for approval." />
            ) : (
              pendingAccounts.map((user) => (
                <article key={user.id} className="rounded-lg border border-line bg-white p-4">
                  <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
                    <div>
                      <p className="font-black">{publicNames.get(user.id) ?? user.username}</p>
                      <p className="text-sm text-muted">{user.email}</p>
                      <p className="mt-1 text-sm font-semibold text-muted">
                        {user.username} · requested {compactDate(user.requestedAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 md:justify-end">
                      <form action={approveOrganizationMembership}>
                        <input type="hidden" name="organizationSlug" value={organizationSlug} />
                        <input type="hidden" name="userId" value={user.id} />
                        <button className="button" type="submit">
                          Approve
                        </button>
                      </form>
                      <form action={rejectOrganizationMembership}>
                        <input type="hidden" name="organizationSlug" value={organizationSlug} />
                        <input type="hidden" name="userId" value={user.id} />
                        <ConfirmSubmitButton
                          className="button-danger"
                          confirmation="This will reject the pending organization membership."
                        >
                          Decline
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
            <p className="label">Organization membership</p>
            <h2 className="mt-1 text-2xl font-black">Add an existing account</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Add a verified Pong Ladder account to this organization. Season membership remains a separate step.
            </p>
          </div>
          {organizationJoinCandidates.length === 0 ? (
            <EmptyState title="No accounts available" body="Every verified account is already linked to this organization." />
          ) : (
            <AddOrganizationMemberForm organizationSlug={organizationSlug} users={organizationJoinCandidates} />
          )}
        </section>

        <section className="section-band">
          <div className="mb-4">
            <p className="label">Season membership</p>
            <h2 className="mt-1 text-2xl font-black">Add player to season</h2>
            <p className="mt-2 text-sm text-muted">
              Add an approved player to season {seasonLabel}. They start at the bottom of the ladder with 0 points.
            </p>
          </div>
          {seasonJoinCandidates.length === 0 ? (
            <EmptyState title="Everyone has joined" body="Every approved player is already in the active season." />
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
            <p className="label">Season membership</p>
            <h2 className="mt-1 text-2xl font-black">Remove players from season</h2>
          </div>
          <div className="grid gap-3">
            {ladder.length === 0 ? (
              <EmptyState title="No season players" body="No players have joined the active season." />
            ) : (
              ladder.map((entry) => (
                <article key={entry.id} className="rounded-lg border border-line bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-black">
                        #{entry.effectivePosition} {publicNames.get(entry.userId) ?? entry.user.username}
                      </p>
                      <p className="text-sm text-muted">
                        {entry.points} pts · {getTeamDisplayName(entry.user)}
                      </p>
                    </div>
                    <form action={adminRemoveSeasonPlayer}>
                      <input type="hidden" name="organizationSlug" value={organizationSlug} />
                      <input type="hidden" name="seasonPlayerId" value={entry.id} />
                      <ConfirmSubmitButton
                        className="button-danger"
                        confirmation="This will remove the player from this season and delete their season matches and challenges."
                      >
                        Remove
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
            <p className="label">Organization membership</p>
            <h2 className="mt-1 text-2xl font-black">Member administration</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Membership access is independent of season participation. Suspending or removing access cancels open
              challenges but preserves completed matches and historical standings.
            </p>
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
                          {membershipStatusLabel(organizationMembership.status)}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black capitalize text-muted">
                          {organizationMembership.role.toLowerCase()}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted">
                        {user.email} · joined via {joinMethodLabel(organizationMembership.joinMethod)}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-muted">
                        {user.username} · {getTeamDisplayName({ ...user, team: organizationMembership.team })} ·{" "}
                        {openChallengeCount} open challenge{openChallengeCount === 1 ? "" : "s"}
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
                              confirmation="This will remove all pending or accepted challenges involving this player."
                              disabled={openChallengeCount === 0}
                            >
                              Cancel open challenges
                            </ConfirmSubmitButton>
                          </form>
                          <form action={suspendOrganizationMembership}>
                            <input type="hidden" name="organizationSlug" value={organizationSlug} />
                            <input type="hidden" name="userId" value={user.id} />
                            <ConfirmSubmitButton
                              className="button-secondary"
                              confirmation="This suspends organization access and cancels open challenges. Completed matches and season history are preserved."
                            >
                              Suspend
                            </ConfirmSubmitButton>
                          </form>
                          <form action={removeOrganizationMembership}>
                            <input type="hidden" name="organizationSlug" value={organizationSlug} />
                            <input type="hidden" name="userId" value={user.id} />
                            <ConfirmSubmitButton
                              className="button-danger"
                              confirmation="This removes organization access and cancels open challenges. Completed matches and season history are preserved."
                            >
                              Remove
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
                            confirmation="This restores active organization access. It does not add the player to the current season."
                          >
                            Reactivate
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
                                ? "This revokes organization administrator access."
                                : "This grants organization administrator access."
                            }
                          >
                            {organizationMembership.role === MembershipRole.ADMIN ? "Make player" : "Make admin"}
                          </ConfirmSubmitButton>
                        </form>
                      ) : null}
                      {canTransferOwnership ? (
                        <form action={transferOrganizationOwnership}>
                          <input type="hidden" name="organizationSlug" value={organizationSlug} />
                          <input type="hidden" name="userId" value={user.id} />
                          <ConfirmSubmitButton
                            className="button-danger"
                            confirmation="This member becomes the organization owner and your role changes to administrator."
                          >
                            Transfer ownership
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
            <p className="label">Audit</p>
            <h2 className="mt-1 text-2xl font-black">Membership activity</h2>
          </div>
          <div className="grid gap-3">
            {auditEvents.length === 0 ? (
              <EmptyState title="No membership changes" body="Administrative membership changes will appear here." />
            ) : (
              auditEvents.map((event) => (
                <article key={event.id} className="rounded-lg border border-line bg-white p-4">
                  <p className="font-black">
                    {event.subjectUser.username} · {auditActionLabel(event.action)}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    by {event.actorUser?.username ?? "system"} · {compactDate(event.createdAt)}
                  </p>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="section-band">
          <div className="mb-4">
            <p className="label">Matches</p>
            <h2 className="mt-1 text-2xl font-black">Delete match results</h2>
          </div>
          <div className="grid gap-3">
            {matches.length === 0 ? (
              <EmptyState title="No matches" body="There are no active-season matches to remove." />
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
                        {compactDate(match.playedAt)}
                        {match.challenge ? " · linked challenge" : ""}
                      </p>
                    </div>
                    <form action={adminDeleteMatch}>
                      <input type="hidden" name="organizationSlug" value={organizationSlug} />
                      <input type="hidden" name="matchId" value={match.id} />
                      <ConfirmSubmitButton className="button-danger" confirmation="This will delete this match result.">
                        Delete
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
            <p className="label">Challenges</p>
            <h2 className="mt-1 text-2xl font-black">Delete challenges</h2>
          </div>
          <div className="grid gap-3">
            {challenges.length === 0 ? (
              <EmptyState title="No challenges" body="There are no active-season challenges to remove." />
            ) : (
              challenges.map((challenge) => (
                <article key={challenge.id} className="rounded-lg border border-line bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-black">
                        {publicNames.get(challenge.challengerId) ?? challenge.challenger.username} vs{" "}
                        {publicNames.get(challenge.challengedId) ?? challenge.challenged.username}
                      </p>
                      <p className="mt-1 text-sm text-muted">{compactDate(challenge.createdAt)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={challenge.status} />
                      <form action={adminDeleteChallenge}>
                        <input type="hidden" name="organizationSlug" value={organizationSlug} />
                        <input type="hidden" name="challengeId" value={challenge.id} />
                        <ConfirmSubmitButton
                          className="button-danger"
                          confirmation="This will delete this challenge. If it has a linked match, that match result will also be deleted."
                        >
                          Delete
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

function AdminStat({ label, value }: { label: string; value: number }) {
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

function membershipStatusLabel(status: MembershipStatus) {
  switch (status) {
    case MembershipStatus.ACTIVE:
      return "Active";
    case MembershipStatus.PENDING:
      return "Pending";
    case MembershipStatus.SUSPENDED:
      return "Suspended";
    case MembershipStatus.REJECTED:
      return "Rejected";
    case MembershipStatus.REMOVED:
      return "Removed";
  }
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

function joinMethodLabel(joinMethod: string) {
  return joinMethod.toLowerCase().replaceAll("_", " ");
}

function auditActionLabel(action: string) {
  return action.toLowerCase().replaceAll("_", " ");
}
