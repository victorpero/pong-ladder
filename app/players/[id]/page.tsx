import { notFound } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { StatCard } from "@/components/StatCard";
import { createChallenge } from "@/lib/actions";
import { canChallengePlayer } from "@/lib/challenge-rules";
import { getPublicPlayerName, getPublicPlayerNames } from "@/lib/display-name";
import { compactDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getActiveSeason, getLadder } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function PlayerPage({ params }: { params: { id: string } }) {
  const [user, season] = await Promise.all([
    prisma.user.findUnique({ where: { id: params.id } }),
    getActiveSeason()
  ]);

  if (!user) {
    notFound();
  }

  const ladder = season ? await getLadder(season.id) : [];
  const entry = ladder.find((item) => item.userId === user.id);
  const challengers = entry ? ladder.filter((item) => item.userId !== entry.userId && canChallengePlayer(item, entry)) : [];
  const challengeTargets = entry ? ladder.filter((item) => item.userId !== entry.userId && canChallengePlayer(entry, item)) : [];

  const [matches, challenges] = season
    ? await Promise.all([
        prisma.match.findMany({
          where: {
            seasonId: season.id,
            OR: [{ winnerId: user.id }, { loserId: user.id }]
          },
          include: { winner: true, loser: true },
          orderBy: { playedAt: "desc" },
          take: 12
        }),
        prisma.challenge.findMany({
          where: {
            seasonId: season.id,
            OR: [{ challengerId: user.id }, { challengedId: user.id }]
          },
          include: { challenger: true, challenged: true },
          orderBy: { createdAt: "desc" },
          take: 8
        })
      ])
    : [[], []];
  const publicNames = getPublicPlayerNames(
    uniqueUsers([
      user,
      ...ladder.map((item) => item.user),
      ...matches.flatMap((match) => [match.winner, match.loser]),
      ...challenges.flatMap((challenge) => [challenge.challenger, challenge.challenged])
    ])
  );
  const publicName = publicNames.get(user.id) ?? getPublicPlayerName(user);

  return (
    <main className="page-shell">
      <section className="mb-6 grid gap-4 md:grid-cols-[1fr_1fr_1fr]">
        <StatCard label="Rank" value={entry ? `#${entry.currentRank}` : "N/A"} />
        <StatCard label="Points" value={entry?.points ?? 0} />
        <StatCard label="Record" value={entry ? `${entry.wins}-${entry.losses}` : "0-0"} />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="section-band">
          <p className="label">Player</p>
          <h1 className="mt-1 text-3xl font-black">{publicName}</h1>
          <p className="mt-1 text-sm text-stone-500">{user.email}</p>

          <h2 className="mt-8 text-xl font-black">Match history</h2>
          <div className="mt-4 grid gap-3">
            {matches.length === 0 ? (
              <EmptyState title="No matches yet" body="Register a match to build this player's history." />
            ) : (
              matches.map((match) => (
	                <div key={match.id} className="rounded-lg border border-line bg-white p-4">
	                  <div className="flex flex-wrap items-center justify-between gap-3">
	                    <p className="font-bold">
	                      {publicNames.get(match.winnerId) ?? match.winner.username} beat{" "}
	                      {publicNames.get(match.loserId) ?? match.loser.username} {match.winnerSets}-{match.loserSets}
	                    </p>
                    <p className="text-sm text-stone-500">{compactDate(match.playedAt)}</p>
                  </div>
                  <p className="mt-2 text-sm text-stone-600">
                    {match.winnerPointsBefore} {"->"} {match.winnerPointsAfter} / {match.loserPointsBefore} {"->"}{" "}
                    {match.loserPointsAfter}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        <aside className="grid gap-4 self-start">
          <section className="section-band">
            <h2 className="text-xl font-black">Challenge actions</h2>
            {!season || !entry ? (
              <p className="mt-3 text-sm text-stone-600">Join the active season before creating challenges.</p>
            ) : (
              <form action={createChallenge} className="mt-4 grid gap-3">
                <input type="hidden" name="seasonId" value={season.id} />
                <label className="grid gap-1">
                  <span className="label">Challenger</span>
                  <select className="field" name="challengerId" required>
                    <option value={user.id}>{publicName}</option>
                    {challengers.map((item) => (
                      <option key={item.userId} value={item.userId}>
                        {publicNames.get(item.userId) ?? item.user.username}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1">
                  <span className="label">Challenge</span>
                  <select className="field" name="challengedId" required>
                    {challengeTargets.map((item) => (
                      <option key={item.userId} value={item.userId}>
                        #{item.currentRank} {publicNames.get(item.userId) ?? item.user.username}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="button" type="submit" disabled={challengeTargets.length === 0}>
                  Create challenge
                </button>
              </form>
            )}
          </section>

          <section className="section-band">
            <h2 className="text-xl font-black">Challenge history</h2>
            <div className="mt-4 grid gap-3">
              {challenges.length === 0 ? (
                <p className="text-sm text-stone-600">No challenge history yet.</p>
              ) : (
                challenges.map((challenge) => (
                  <div key={challenge.id} className="rounded-lg border border-line bg-white p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold">
                        {publicNames.get(challenge.challengerId) ?? challenge.challenger.username} {"->"}{" "}
                        {publicNames.get(challenge.challengedId) ?? challenge.challenged.username}
                      </p>
                      <StatusBadge status={challenge.status} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}

function uniqueUsers<T extends { id: string }>(users: T[]) {
  return Array.from(new Map(users.map((user) => [user.id, user])).values());
}
