import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { EmptyState } from "@/components/EmptyState";
import { PlayerCombobox } from "@/components/PlayerCombobox";
import { StatusBadge } from "@/components/StatusBadge";
import { StatCard } from "@/components/StatCard";
import { createChallenge } from "@/lib/actions";
import { canChallengePlayer } from "@/lib/challenge-rules";
import { getPublicPlayerName, getPublicPlayerNames } from "@/lib/display-name";
import { compactDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getActiveSeason, getLadder } from "@/lib/queries";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";
import { getTeamDisplayName } from "@/lib/team-display";

export const dynamic = "force-dynamic";

export default async function PlayerPage({ params }: { params: { id: string } }) {
  const [user, season, session] = await Promise.all([
    prisma.user.findUnique({ where: { id: params.id }, include: { team: true } }),
    getActiveSeason(),
    verifySessionToken(cookies().get(SESSION_COOKIE_NAME)?.value)
  ]);

  if (!user) {
    notFound();
  }

  const ladder = season ? await getLadder(season.id) : [];
  const entry = ladder.find((item) => item.userId === user.id);
  const currentPlayer = session ? ladder.find((item) => item.userId === session.sub) : null;
  const challengeTargets = currentPlayer
    ? ladder.filter((item) => item.userId !== currentPlayer.userId && canChallengePlayer(currentPlayer, item))
    : [];

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
  const currentPlayerName = currentPlayer
    ? publicNames.get(currentPlayer.userId) ?? currentPlayer.user.username
    : session?.username ?? "";
  const challengeOptions = challengeTargets.map((item) => ({
    id: item.userId,
    label: `${publicNames.get(item.userId) ?? item.user.username} (#${item.currentRank})`,
    detail: `${item.points} pts`
  }));
  const defaultChallengeTargetId = challengeTargets.some((item) => item.userId === user.id) ? user.id : undefined;

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
          <p className="mt-1 text-sm text-muted">{getTeamDisplayName(user)}</p>

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
                    <p className="text-sm text-muted">{compactDate(match.playedAt)}</p>
                  </div>
                  <p className="mt-2 text-sm text-muted">
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
            {!session ? (
              <p className="mt-3 text-sm text-muted">Log in before creating challenges.</p>
            ) : !season || !currentPlayer ? (
              <p className="mt-3 text-sm text-muted">Join the active season before creating challenges.</p>
            ) : (
              <form action={createChallenge} className="mt-4 grid gap-3">
                <input type="hidden" name="seasonId" value={season.id} />
                <label className="grid gap-1">
                  <span className="label">Challenger</span>
                  <input className="field" value={currentPlayerName} readOnly />
                </label>
                <PlayerCombobox
                  name="challengedId"
                  label="Challenge"
                  players={challengeOptions}
                  defaultPlayerId={defaultChallengeTargetId}
                  disabled={challengeOptions.length === 0}
                />
                <button className="button" type="submit" disabled={challengeOptions.length === 0}>
                  Create challenge
                </button>
              </form>
            )}
          </section>

          <section className="section-band">
            <h2 className="text-xl font-black">Challenge history</h2>
            <div className="mt-4 grid gap-3">
              {challenges.length === 0 ? (
                <p className="text-sm text-muted">No challenge history yet.</p>
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
