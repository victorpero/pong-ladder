import { redirect } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";
import { createTeam, deleteTeam, joinTeam, leaveTeam } from "@/lib/actions";
import { requireOrganizationUser } from "@/lib/authz";
import { getPublicPlayerNames } from "@/lib/display-name";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";
import { plural } from "@/lib/i18n/format";
import { prisma } from "@/lib/prisma";
import { organizationPath } from "@/lib/organization-paths";
import { getTeamIdsWithRecordedResults } from "@/lib/queries";

export default async function OrganizationTeamsPage({
  locale,
  organizationSlug
}: {
  locale: Locale;
  organizationSlug: string;
}) {
  const dictionary = getDictionary(locale);
  const { session, organization } = await requireOrganizationUser(
    organizationSlug,
    organizationPath(locale, organizationSlug, "teams")
  );

  const [currentMembership, teams, teamIdsWithResults] = await Promise.all([
    prisma.membership.findUnique({
      where: { userId_organizationId: { userId: session.sub, organizationId: organization.id } },
      include: { user: true, team: true }
    }),
    prisma.team.findMany({
      where: { organizationId: organization.id },
      include: {
        members: {
          where: { organizationId: organization.id, status: "ACTIVE" },
          include: { user: true },
          orderBy: { user: { username: "asc" } }
        }
      },
      orderBy: { name: "asc" }
    }),
    getTeamIdsWithRecordedResults(organization.id)
  ]);

  if (!currentMembership) {
    redirect("/logout");
  }

  const currentUser = { ...currentMembership.user, team: currentMembership.team, teamId: currentMembership.teamId };
  const teamsWithUsers = teams.map((team) => ({ ...team, members: team.members.map((member) => member.user) }));

  const publicNames = getPublicPlayerNames([
    currentUser,
    ...teamsWithUsers.flatMap((team) => team.members)
  ]);

  return (
    <main className="page-shell">
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="section-band">
          <p className="label">{dictionary.teams.label}</p>
          <h1 className="mt-1 text-3xl font-black">{dictionary.teams.heading}</h1>

          <div className="mt-6 grid gap-3">
            {teamsWithUsers.length === 0 ? (
              <EmptyState title={dictionary.teams.emptyTitle} body={dictionary.teams.emptyBody} />
            ) : (
              teamsWithUsers.map((team) => {
                const isCurrentTeam = currentUser.teamId === team.id;
                // A team that has played holds season history in the standings,
                // so it stays even once the last member leaves.
                const hasSeasonHistory = teamIdsWithResults.has(team.id);
                const isDeletable = team.members.length === 0 && !hasSeasonHistory;

                return (
                  <article key={team.id} className="rounded-lg border border-line bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-black">{team.name}</p>
                        <p className="text-sm text-muted">
                          {plural(team.members.length, dictionary.teams.memberCount)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {isCurrentTeam ? (
                          <span className="rounded-md border border-court-200 bg-court-50 px-3 py-2 text-sm font-black text-court-700">
                            {dictionary.teams.yourTeamBadge}
                          </span>
                        ) : (
                          <form action={joinTeam}>
                            <input type="hidden" name="organizationSlug" value={organizationSlug} />
                            <input type="hidden" name="teamId" value={team.id} />
                            <button className="button-secondary" type="submit">
                              {currentUser.teamId ? dictionary.teams.switchTeam : dictionary.teams.joinTeam}
                            </button>
                          </form>
                        )}
                        {isDeletable ? (
                          <form action={deleteTeam}>
                            <input type="hidden" name="organizationSlug" value={organizationSlug} />
                            <input type="hidden" name="teamId" value={team.id} />
                            <button className="button-danger" type="submit">
                              {dictionary.common.delete}
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </div>

                    {team.members.length === 0 && hasSeasonHistory ? (
                      <p className="mt-3 text-sm text-muted">Kept for its recorded season results.</p>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-2">
                      {team.members.length === 0 ? (
                        <span className="text-sm text-muted">{dictionary.teams.noMembers}</span>
                      ) : (
                        team.members.map((member) => (
                          <span
                            key={member.id}
                            className="rounded-md border border-line bg-slate-50 px-2.5 py-1 text-sm font-semibold text-neutral"
                          >
                            {publicNames.get(member.id) ?? member.username}
                          </span>
                        ))
                      )}
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        <aside className="grid gap-4 self-start">
          <section className="section-band">
            <h2 className="text-xl font-black">{dictionary.teams.yourTeamHeading}</h2>
            {currentUser.team ? (
              <>
                <p className="mt-3 text-lg font-black">{currentUser.team.name}</p>
                <form action={leaveTeam} className="mt-4">
                  <input type="hidden" name="organizationSlug" value={organizationSlug} />
                  <button className="button-danger" type="submit">
                    {dictionary.teams.leaveTeam}
                  </button>
                </form>
              </>
            ) : (
              <p className="mt-3 text-sm text-muted">{dictionary.teams.noTeam}</p>
            )}
          </section>

          <section className="section-band">
            <h2 className="text-xl font-black">{dictionary.teams.createHeading}</h2>
            <form action={createTeam} className="mt-4 grid gap-3">
              <input type="hidden" name="organizationSlug" value={organizationSlug} />
              <label className="grid gap-1">
                <span className="label">{dictionary.teams.nameLabel}</span>
                <input className="field" name="name" required minLength={2} maxLength={50} />
              </label>
              <button className="button" type="submit">
                {dictionary.teams.createButton}
              </button>
            </form>
          </section>
        </aside>
      </div>
    </main>
  );
}
