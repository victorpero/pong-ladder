import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";
import { createTeam, deleteTeam, joinTeam, leaveTeam } from "@/lib/actions";
import { getPublicPlayerNames } from "@/lib/display-name";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  const session = await verifySessionToken(cookies().get(SESSION_COOKIE_NAME)?.value);

  if (!session) {
    redirect("/login?next=/teams");
  }

  const [currentUser, teams] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.sub },
      include: { team: true }
    }),
    prisma.team.findMany({
      include: {
        members: {
          orderBy: { username: "asc" }
        }
      },
      orderBy: { name: "asc" }
    })
  ]);

  if (!currentUser) {
    redirect("/logout");
  }

  const publicNames = getPublicPlayerNames([
    currentUser,
    ...teams.flatMap((team) => team.members)
  ]);

  return (
    <main className="page-shell">
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="section-band">
          <p className="label">Teams</p>
          <h1 className="mt-1 text-3xl font-black">Team directory</h1>

          <div className="mt-6 grid gap-3">
            {teams.length === 0 ? (
              <EmptyState title="No teams yet" body="Create the first team and invite players to join it." />
            ) : (
              teams.map((team) => {
                const isCurrentTeam = currentUser.teamId === team.id;
                const isEmptyTeam = team.members.length === 0;

                return (
                  <article key={team.id} className="rounded-lg border border-line bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-black">{team.name}</p>
                        <p className="text-sm text-stone-500">
                          {team.members.length} member{team.members.length === 1 ? "" : "s"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {isCurrentTeam ? (
                          <span className="rounded-md border border-court-200 bg-court-50 px-3 py-2 text-sm font-black text-court-700">
                            Your team
                          </span>
                        ) : (
                          <form action={joinTeam}>
                            <input type="hidden" name="teamId" value={team.id} />
                            <button className="button-secondary" type="submit">
                              {currentUser.teamId ? "Switch team" : "Join team"}
                            </button>
                          </form>
                        )}
                        {isEmptyTeam ? (
                          <form action={deleteTeam}>
                            <input type="hidden" name="teamId" value={team.id} />
                            <button className="button-secondary" type="submit">
                              Delete
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {team.members.length === 0 ? (
                        <span className="text-sm text-stone-500">No members yet</span>
                      ) : (
                        team.members.map((member) => (
                          <span
                            key={member.id}
                            className="rounded-md border border-line bg-stone-50 px-2.5 py-1 text-sm font-semibold text-stone-700"
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
            <h2 className="text-xl font-black">Your team</h2>
            {currentUser.team ? (
              <>
                <p className="mt-3 text-lg font-black">{currentUser.team.name}</p>
                <form action={leaveTeam} className="mt-4">
                  <button className="button-secondary" type="submit">
                    Leave team
                  </button>
                </form>
              </>
            ) : (
              <p className="mt-3 text-sm text-stone-600">You are not on a team yet.</p>
            )}
          </section>

          <section className="section-band">
            <h2 className="text-xl font-black">Create team</h2>
            <form action={createTeam} className="mt-4 grid gap-3">
              <label className="grid gap-1">
                <span className="label">Team name</span>
                <input className="field" name="name" required minLength={2} maxLength={50} />
              </label>
              <button className="button" type="submit">
                Create and join
              </button>
            </form>
          </section>
        </aside>
      </div>
    </main>
  );
}
