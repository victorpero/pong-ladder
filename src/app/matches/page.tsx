import { cookies } from "next/headers";
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { PlayerCombobox } from "@/components/PlayerCombobox";
import { registerMatchResult } from "@/lib/actions";
import { getPublicPlayerNames } from "@/lib/display-name";
import { compactDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getActiveSeason, getLadder } from "@/lib/queries";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function MatchesPage({ searchParams }: { searchParams?: { challengeId?: string } }) {
  const season = await getActiveSeason();
  const ladder = season ? await getLadder(season.id) : [];
  const session = await verifySessionToken(cookies().get(SESSION_COOKIE_NAME)?.value);
  const matches = season
    ? await prisma.match.findMany({
        where: { seasonId: season.id },
        include: { winner: true, loser: true, challenge: true },
        orderBy: { playedAt: "desc" },
        take: 30
      })
    : [];
  const acceptedChallenges = season && session
    ? await prisma.challenge.findMany({
        where: {
          seasonId: season.id,
          status: "Accepted",
          OR: [{ challengerId: session.sub }, { challengedId: session.sub }]
        },
        include: { challenger: true, challenged: true },
        orderBy: { createdAt: "desc" }
      })
    : [];
  const selectedChallenge =
    acceptedChallenges.find((challenge) => challenge.id === searchParams?.challengeId) ?? acceptedChallenges[0] ?? null;
  const usersForNames = [
    ...ladder.map((entry) => entry.user),
    ...matches.flatMap((match) => [match.winner, match.loser]),
    ...acceptedChallenges.flatMap((challenge) => [challenge.challenger, challenge.challenged])
  ];
  const publicNames = getPublicPlayerNames(uniqueUsers(usersForNames));
  const selectedChallengePlayers = selectedChallenge
    ? [selectedChallenge.challenger, selectedChallenge.challenged].map((player) => {
        const ladderEntry = ladder.find((entry) => entry.userId === player.id);

        return {
          id: player.id,
          label: publicNames.get(player.id) ?? player.username,
          detail: ladderEntry ? `#${ladderEntry.currentRank} · ${ladderEntry.points} points` : "Accepted challenge"
        };
      })
    : [];

  const today = new Date().toISOString().slice(0, 10);

  return (
    <main className="page-shell">
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <section className="section-band">
          <p className="label">Matches</p>
          <h1 className="mt-1 text-3xl font-black">Recent results</h1>

          <div className="mt-6 grid gap-3">
            {matches.length === 0 ? (
              <EmptyState title="No match results" body="Register a best-of-five result to update points and rankings." />
            ) : (
              matches.map((match) => (
                <article key={match.id} className="rounded-lg border border-line bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-black">
                        {publicNames.get(match.winnerId) ?? match.winner.username} {match.winnerSets}-{match.loserSets}{" "}
                        {publicNames.get(match.loserId) ?? match.loser.username}
                      </p>
                      <p className="text-sm text-muted">{compactDate(match.playedAt)}</p>
                    </div>
                    <div className="rounded-md bg-green-50 px-3 py-2 text-sm font-bold text-success">
                      +{match.winnerPointsAfter - match.winnerPointsBefore} / +
                      {match.loserPointsAfter - match.loserPointsBefore}
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-muted sm:grid-cols-2">
                    <p className="font-semibold text-success">
                      Winner: {match.winnerPointsBefore} {"->"} {match.winnerPointsAfter}
                    </p>
                    <p className="font-semibold text-court-700">
                      Loser: {match.loserPointsBefore} {"->"} {match.loserPointsAfter}
                    </p>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <aside className="grid gap-4 self-start">
          <section className="section-band">
            <h2 className="text-xl font-black">Register match</h2>
            {acceptedChallenges.length === 0 ? (
              <div className="mt-4 rounded-lg border border-line bg-white p-4">
                <p className="text-sm font-semibold text-muted">Challenge another player to register a match</p>
                <Link className="button mt-4" href="/challenges">
                  Challenge player
                </Link>
              </div>
            ) : (
              <>
                <div className="mt-4 grid gap-2">
                  <p className="label">Challenge</p>
                  <div className="grid gap-2">
                    {acceptedChallenges.map((challenge) => {
                      const isSelected = selectedChallenge?.id === challenge.id;

                      return (
                        <Link
                          key={challenge.id}
                          href={`/matches?challengeId=${challenge.id}`}
                          className={isSelected ? "button" : "button-secondary"}
                        >
                          {publicNames.get(challenge.challengerId) ?? challenge.challenger.username} vs{" "}
                          {publicNames.get(challenge.challengedId) ?? challenge.challenged.username}
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {selectedChallenge ? (
                  <form action={registerMatchResult} className="mt-4 grid gap-3">
                    <input type="hidden" name="seasonId" value={season?.id ?? ""} />
                    <input type="hidden" name="challengeId" value={selectedChallenge.id} />
                    <PlayerCombobox
                      name="winnerId"
                      label="Winner"
                      players={selectedChallengePlayers}
                      disabled={!season || selectedChallengePlayers.length < 2}
                    />
                    <PlayerCombobox
                      name="loserId"
                      label="Loser"
                      players={selectedChallengePlayers}
                      disabled={!season || selectedChallengePlayers.length < 2}
                    />
                    <label className="grid gap-1">
                      <span className="label">Result</span>
                      <select className="field" name="loserSets" required>
                        <option value="0">3-0</option>
                        <option value="1">3-1</option>
                        <option value="2">3-2</option>
                      </select>
                    </label>
                    <label className="grid gap-1">
                      <span className="label">Date</span>
                      <input className="field" name="playedAt" type="date" defaultValue={today} />
                    </label>
                    <button className="button" type="submit" disabled={!season || selectedChallengePlayers.length < 2}>
                      Save result
                    </button>
                  </form>
                ) : null}
              </>
            )}
          </section>

        </aside>
      </div>
    </main>
  );
}

function uniqueUsers<T extends { id: string }>(users: T[]) {
  return Array.from(new Map(users.map((user) => [user.id, user])).values());
}
