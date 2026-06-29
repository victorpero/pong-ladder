import { cookies } from "next/headers";
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { JoinSeasonToggle } from "@/components/JoinSeasonToggle";
import { StatCard } from "@/components/StatCard";
import { getPublicPlayerNames } from "@/lib/display-name";
import { getSeasonLabel } from "@/lib/fixed-seasons";
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
  const seasonLabel = getSeasonLabel(season.year, season.seasonNumber);

  return (
    <main className="page-shell">
      <section className="mb-6 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="section-band">
          <p className="label">Active season</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Season {seasonLabel}</h1>
          <p className="mt-2 text-sm font-semibold text-muted">
            {formatDate(season.startsAt)} to {formatDate(season.endsAt ?? season.startsAt)}
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
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
          <Link className="button" href="/challenges">
            Challenge player
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
                className={`rank-in grid gap-3 rounded-lg border p-4 transition hover:-translate-y-0.5 hover:shadow-soft sm:grid-cols-[72px_1fr_90px_72px_72px_72px] ${getRankStyles(entry.currentRank).row}`}
                style={{ animationDelay: `${index * 35}ms` }}
              >
                <div>
                  <p className="stat-label">Rank</p>
                  <RankBadge rank={entry.currentRank} />
                </div>
                <div>
                  <p className="text-lg font-black">{publicNames.get(entry.userId) ?? entry.user.username}</p>
                  <p className="text-sm text-muted">{getTeamDisplayName(entry.user)}</p>
                </div>
                <Score label="Points" value={entry.points} strong />
                <Score label="Played" value={entry.matchesPlayed} />
                <Score label="Wins" value={entry.wins} tone="success" />
                <Score label="Losses" value={entry.losses} tone="danger" />
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="section-band mt-6">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="label">Team ladder</p>
            <h2 className="mt-1 text-2xl font-black">Season {seasonLabel} team standings</h2>
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
                className={`rank-in grid gap-3 rounded-lg border p-4 sm:grid-cols-[72px_1fr_90px_72px_72px_72px] ${getRankStyles(team.currentRank).row}`}
                style={{ animationDelay: `${index * 35}ms` }}
              >
                <div>
                  <p className="stat-label">Rank</p>
                  <RankBadge rank={team.currentRank} />
                </div>
                <div>
                  <p className="text-lg font-black">{team.name}</p>
                  <p className="text-sm text-muted">
                    {team.players} player{team.players === 1 ? "" : "s"}
                  </p>
                </div>
                <Score label="Points" value={team.points} strong />
                <Score label="Played" value={team.matchesPlayed} />
                <Score label="Wins" value={team.wins} tone="success" />
                <Score label="Losses" value={team.losses} tone="danger" />
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function RankBadge({ rank }: { rank: number }) {
  return <p className={`inline-flex rounded-full px-3 py-1 text-2xl font-black ${getRankStyles(rank).badge}`}>#{rank}</p>;
}

function getRankStyles(rank: number) {
  if (rank === 1) {
    return {
      row: "border-amber-200 bg-amber-50 hover:border-amber-300",
      badge: "bg-amber-100 text-amber-800"
    };
  }

  if (rank === 2) {
    return {
      row: "border-slate-200 bg-slate-50 hover:border-slate-300",
      badge: "bg-slate-200 text-neutral"
    };
  }

  if (rank === 3) {
    return {
      row: "border-orange-200 bg-orange-50 hover:border-orange-300",
      badge: "bg-orange-100 text-orange-800"
    };
  }

  return {
    row: "border-line bg-white hover:border-slate-300",
    badge: "bg-slate-100 text-neutral"
  };
}

function Score({
  label,
  value,
  strong,
  tone
}: {
  label: string;
  value: number;
  strong?: boolean;
  tone?: "success" | "danger" | "neutral";
}) {
  const toneClass = tone === "success" ? "text-success" : tone === "danger" ? "text-court-700" : "text-ink";

  return (
    <div>
      <p className="stat-label">{label}</p>
      <p className={`${strong ? "text-2xl font-black" : "text-xl font-bold"} ${toneClass}`}>{value}</p>
    </div>
  );
}

function getDaysUntilNextSeason(nextSeasonStartsAt: Date) {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const remainingMilliseconds = nextSeasonStartsAt.getTime() - Date.now();

  return Math.max(0, Math.ceil(remainingMilliseconds / millisecondsPerDay));
}
