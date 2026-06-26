import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { createPlayer, joinSeason } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { getActiveSeason, getLadder, getUsers } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function PlayersPage() {
  const [users, seasons, activeSeason] = await Promise.all([
    getUsers(),
    prisma.season.findMany({ orderBy: { year: "desc" } }),
    getActiveSeason()
  ]);
  const ladder = activeSeason ? await getLadder(activeSeason.id) : [];
  const joinedIds = new Set(ladder.map((entry) => entry.userId));

  return (
    <main className="page-shell">
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="section-band">
          <p className="label">Players</p>
          <h1 className="mt-1 text-3xl font-black">Player directory</h1>

          <div className="mt-6 grid gap-3">
            {users.length === 0 ? (
              <EmptyState title="No players yet" body="Create the first player account to start a season ladder." />
            ) : (
              users.map((user) => {
                const ladderEntry = ladder.find((entry) => entry.userId === user.id);

                return (
                  <Link
                    key={user.id}
                    href={`/players/${user.id}`}
                    className="grid gap-3 rounded-lg border border-line bg-white p-4 transition hover:border-court-500 sm:grid-cols-[1fr_120px_120px]"
                  >
                    <div>
                      <p className="font-black">{user.username}</p>
                      <p className="text-sm text-stone-500">{user.email}</p>
                    </div>
                    <div>
                      <p className="stat-label">Rank</p>
                      <p className="font-bold">{ladderEntry ? `#${ladderEntry.currentRank}` : "Not joined"}</p>
                    </div>
                    <div>
                      <p className="stat-label">Points</p>
                      <p className="font-bold">{ladderEntry?.points ?? 0}</p>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </section>

        <aside className="grid gap-4 self-start">
          <section className="section-band">
            <h2 className="text-xl font-black">Create player</h2>
            <form action={createPlayer} className="mt-4 grid gap-3">
              <label className="grid gap-1">
                <span className="label">Username</span>
                <input className="field" name="username" required minLength={2} />
              </label>
              <label className="grid gap-1">
                <span className="label">Email</span>
                <input className="field" name="email" type="email" required />
              </label>
              <label className="grid gap-1">
                <span className="label">Password</span>
                <input className="field" name="password" type="password" minLength={8} required />
              </label>
              <button className="button" type="submit">
                Create player
              </button>
            </form>
          </section>

          <section className="section-band">
            <h2 className="text-xl font-black">Join season</h2>
            <form action={joinSeason} className="mt-4 grid gap-3">
              <label className="grid gap-1">
                <span className="label">Season</span>
                <select className="field" name="seasonId" defaultValue={activeSeason?.id} required>
                  {seasons.map((season) => (
                    <option key={season.id} value={season.id}>
                      {season.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1">
                <span className="label">Player</span>
                <select className="field" name="userId" required>
                  {users.map((user) => (
                    <option key={user.id} value={user.id} disabled={joinedIds.has(user.id)}>
                      {user.username}
                    </option>
                  ))}
                </select>
              </label>
              <button className="button" type="submit" disabled={users.length === 0 || seasons.length === 0}>
                Join season
              </button>
            </form>
          </section>
        </aside>
      </div>
    </main>
  );
}
