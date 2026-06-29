import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { getPublicPlayerNames } from "@/lib/display-name";
import { getActiveSeason, getLadder, getUsers } from "@/lib/queries";
import { getTeamDisplayName } from "@/lib/team-display";

export const dynamic = "force-dynamic";

export default async function PlayersPage() {
  const [users, activeSeason] = await Promise.all([
    getUsers(),
    getActiveSeason()
  ]);
  const ladder = activeSeason ? await getLadder(activeSeason.id) : [];
  const publicNames = getPublicPlayerNames(users);

  return (
    <main className="page-shell">
      <section className="section-band">
        <p className="label">Players</p>
        <h1 className="mt-1 text-3xl font-black">Player directory</h1>

        <div className="mt-6 grid gap-3">
          {users.length === 0 ? (
            <EmptyState title="No players yet" body="Players will appear here after accounts are created." />
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
                    <p className="font-black">{publicNames.get(user.id) ?? user.username}</p>
                    <p className="text-sm text-muted">{getTeamDisplayName(user)}</p>
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
    </main>
  );
}
