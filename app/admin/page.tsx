import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { adminDeleteChallenge, adminDeleteMatch, adminRemoveSeasonPlayer } from "@/lib/admin-actions";
import { getPublicPlayerNames } from "@/lib/display-name";
import { compactDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getActiveSeason, getLadder } from "@/lib/queries";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";
import { getTeamDisplayName } from "@/lib/team-display";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await verifySessionToken(cookies().get(SESSION_COOKIE_NAME)?.value);

  if (!session) {
    redirect("/login?next=/admin");
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { isAdmin: true }
  });

  if (!currentUser?.isAdmin) {
    redirect("/ladder");
  }

  const season = await getActiveSeason();
  const [ladder, users, matches, challenges] = await Promise.all([
    getLadder(season.id),
    prisma.user.findMany({
      include: { team: true },
      orderBy: [{ isAdmin: "desc" }, { username: "asc" }]
    }),
    prisma.match.findMany({
      where: { seasonId: season.id },
      include: { winner: true, loser: true, challenge: true },
      orderBy: [{ playedAt: "desc" }, { createdAt: "desc" }]
    }),
    prisma.challenge.findMany({
      where: { seasonId: season.id },
      include: { challenger: true, challenged: true, match: true },
      orderBy: { createdAt: "desc" }
    })
  ]);
  const publicNames = getPublicPlayerNames(
    uniqueUsers([
      ...users,
      ...ladder.map((entry) => entry.user),
      ...matches.flatMap((match) => [match.winner, match.loser]),
      ...challenges.flatMap((challenge) => [challenge.challenger, challenge.challenged])
    ])
  );

  return (
    <main className="page-shell">
      <section className="mb-6 grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr]">
        <div className="section-band">
          <p className="label">Admin</p>
          <h1 className="mt-1 text-3xl font-black">Root controls</h1>
          <p className="mt-2 text-sm text-stone-600">
            Season {season.seasonNumber}, {season.year}
          </p>
        </div>
        <AdminStat label="Season players" value={ladder.length} />
        <AdminStat label="Matches" value={matches.length} />
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
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
                        #{entry.currentRank} {publicNames.get(entry.userId) ?? entry.user.username}
                      </p>
                      <p className="text-sm text-stone-500">
                        {entry.points} pts · {getTeamDisplayName(entry.user)}
                      </p>
                    </div>
                    <form action={adminRemoveSeasonPlayer}>
                      <input type="hidden" name="seasonPlayerId" value={entry.id} />
                      <button className="button-secondary" type="submit">
                        Remove
                      </button>
                    </form>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="section-band">
          <div className="mb-4">
            <p className="label">Accounts</p>
            <h2 className="mt-1 text-2xl font-black">All players</h2>
          </div>
          <div className="grid gap-3">
            {users.map((user) => (
              <article key={user.id} className="rounded-lg border border-line bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-black">{publicNames.get(user.id) ?? user.username}</p>
                    <p className="text-sm text-stone-500">
                      {getTeamDisplayName(user)}
                      {user.isAdmin ? " · admin" : ""}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-stone-500">{user.username}</p>
                </div>
              </article>
            ))}
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
                      <p className="text-sm text-stone-500">
                        {compactDate(match.playedAt)}
                        {match.challenge ? " · linked challenge" : ""}
                      </p>
                    </div>
                    <form action={adminDeleteMatch}>
                      <input type="hidden" name="matchId" value={match.id} />
                      <button className="button-secondary" type="submit">
                        Delete
                      </button>
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
                      <p className="mt-1 text-sm text-stone-500">{compactDate(challenge.createdAt)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={challenge.status} />
                      <form action={adminDeleteChallenge}>
                        <input type="hidden" name="challengeId" value={challenge.id} />
                        <button className="button-secondary" type="submit">
                          Delete
                        </button>
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
