import { cookies } from "next/headers";
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { JoinSeasonToggle } from "@/components/JoinSeasonToggle";
import { StatCard } from "@/components/StatCard";
import { getPublicPlayerNames } from "@/lib/display-name";
import { formatDate } from "@/lib/format";
import { getActiveSeason, getLadder, getTeamLadder } from "@/lib/queries";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";
import { getTeamDisplayName } from "@/lib/team-display";

export const dynamic = "force-dynamic";

export default async function LadderPage() {
  const season = await getActiveSeason();

  if (!season) {
    return (
      <main className="page-shell">
        <EmptyState title="No active season" body="The current fixed season could not be loaded." />
      </main>
    );
  }

  const [ladder, teamLadder] = await Promise.all([getLadder(season.id), getTeamLadder(season.id)]);
  const session = await verifySessionToken(cookies().get(SESSION_COOKIE_NAME)?.value);
  const currentPlayer = session ? ladder.find((entry) => entry.userId === session.sub) : null;
  const publicNames = getPublicPlayerNames(ladder.map((entry) => entry.user));
  const daysUntilNextSeason = getDaysUntilNextSeason(season.endsAt ?? season.startsAt);

  return (
    <main className="page-shell">
      <section className="mb-6 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="section-band">
          <p className="label">Active season</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Season {season.seasonNumber}</h1>
          <p className="mt-2 text-sm font-semibold text-stone-500">
            {formatDate(season.startsAt)} to {formatDate(season.endsAt ?? season.startsAt)}
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
            Challenge players above you, register best-of-five results, and climb the season points ladder.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Players" value={ladder.length} />
          <StatCard label="Teams" value={teamLadder.length} />
          <StatCard label="Days left" value={`${daysUntilNextSeason} day${daysUntilNextSeason === 1 ? "" : "s"}`} />
        </div>
      </section>

      <section className="mb-6">
        <JoinSeasonToggle joined={Boolean(currentPlayer)} hasActiveSeason={Boolean(season)} />
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
                  <p className="text-lg font-black">{publicNames.get(entry.userId) ?? entry.user.username}</p>
                  <p className="text-sm text-stone-500">{getTeamDisplayName(entry.user)}</p>
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

      <section className="section-band mt-6">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="label">Team ladder</p>
            <h2 className="mt-1 text-2xl font-black">Season {season.seasonNumber} team standings</h2>
          </div>
          <Link className="button-secondary" href="/teams">
            Manage teams
          </Link>
        </div>

        {teamLadder.length === 0 ? (
          <EmptyState title="No team standings yet" body="Join a team to appear on the season team ladder." />
        ) : (
          <div className="grid gap-3">
            {teamLadder.map((team, index) => (
              <article
                key={team.id}
                className="rank-in grid gap-3 rounded-lg border border-line bg-white p-4 sm:grid-cols-[72px_1fr_90px_72px_72px_72px]"
                style={{ animationDelay: `${index * 35}ms` }}
              >
                <div>
                  <p className="stat-label">Rank</p>
                  <p className="text-3xl font-black text-court-700">#{team.currentRank}</p>
                </div>
                <div>
                  <p className="text-lg font-black">{team.name}</p>
                  <p className="text-sm text-stone-500">
                    {team.players} player{team.players === 1 ? "" : "s"}
                  </p>
                </div>
                <Score label="Points" value={team.points} strong />
                <Score label="Played" value={team.matchesPlayed} />
                <Score label="Wins" value={team.wins} />
                <Score label="Losses" value={team.losses} />
              </article>
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

function getDaysUntilNextSeason(nextSeasonStartsAt: Date) {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const remainingMilliseconds = nextSeasonStartsAt.getTime() - Date.now();

  return Math.max(0, Math.ceil(remainingMilliseconds / millisecondsPerDay));
}
