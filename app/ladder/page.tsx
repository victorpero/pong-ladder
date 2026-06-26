import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { StatCard } from "@/components/StatCard";
import { getActiveSeason, getLadder } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function LadderPage() {
  const season = await getActiveSeason();

  if (!season) {
    return (
      <main className="page-shell">
        <EmptyState title="No active season" body="Create or seed a season to start building the yearly ladder." />
      </main>
    );
  }

  const ladder = await getLadder(season.id);
  const totalMatches = ladder.reduce((sum, player) => sum + player.matchesPlayed, 0) / 2;

  return (
    <main className="page-shell">
      <section className="mb-6 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="section-band">
          <p className="label">Active season</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">{season.name}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
            Challenge players above you, register best-of-five results, and climb the yearly points ladder.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Players" value={ladder.length} />
          <StatCard label="Matches" value={totalMatches} />
          <StatCard label="Year" value={season.year} />
        </div>
      </section>

      <section className="section-band">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="label">Ladder</p>
            <h2 className="mt-1 text-2xl font-black">Current standings</h2>
          </div>
          <Link className="button-secondary" href="/matches">
            Register match
          </Link>
        </div>

        {ladder.length === 0 ? (
          <EmptyState title="The ladder is empty" body="Add players and join them to the active season." />
        ) : (
          <div className="grid gap-3">
            {ladder.map((entry, index) => (
              <Link
                href={`/players/${entry.userId}`}
                key={entry.id}
                className="rank-in grid gap-3 rounded-lg border border-line bg-white p-4 transition hover:-translate-y-0.5 hover:border-court-500 hover:shadow-soft sm:grid-cols-[72px_1fr_90px_72px_72px_72px]"
                style={{ animationDelay: `${index * 35}ms` }}
              >
                <div>
                  <p className="stat-label">Rank</p>
                  <p className="text-3xl font-black text-court-700">#{entry.currentRank}</p>
                </div>
                <div>
                  <p className="text-lg font-black">{entry.user.username}</p>
                  <p className="text-sm text-stone-500">{entry.user.email}</p>
                </div>
                <Score label="Points" value={entry.points} strong />
                <Score label="Played" value={entry.matchesPlayed} />
                <Score label="Wins" value={entry.wins} />
                <Score label="Losses" value={entry.losses} />
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function Score({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div>
      <p className="stat-label">{label}</p>
      <p className={strong ? "text-2xl font-black" : "text-xl font-bold"}>{value}</p>
    </div>
  );
}
