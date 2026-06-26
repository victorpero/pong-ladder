import { EmptyState } from "@/components/EmptyState";
import { createSeason, registerMatchResult } from "@/lib/actions";
import { compactDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getActiveSeason, getLadder } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function MatchesPage() {
  const season = await getActiveSeason();
  const ladder = season ? await getLadder(season.id) : [];
  const matches = season
    ? await prisma.match.findMany({
        where: { seasonId: season.id },
        include: { winner: true, loser: true, challenge: true },
        orderBy: { playedAt: "desc" },
        take: 30
      })
    : [];
  const openChallenges = season
    ? await prisma.challenge.findMany({
        where: { seasonId: season.id, status: { in: ["Accepted", "Pending"] } },
        include: { challenger: true, challenged: true },
        orderBy: { createdAt: "desc" }
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
                        {match.winner.username} {match.winnerSets}-{match.loserSets} {match.loser.username}
                      </p>
                      <p className="text-sm text-stone-500">{compactDate(match.playedAt)}</p>
                    </div>
                    <div className="rounded-md bg-court-50 px-3 py-2 text-sm font-bold text-court-900">
                      +{match.winnerPointsAfter - match.winnerPointsBefore} / +
                      {match.loserPointsAfter - match.loserPointsBefore}
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-stone-600 sm:grid-cols-2">
                    <p>
                      Winner: {match.winnerPointsBefore} {"->"} {match.winnerPointsAfter}
                    </p>
                    <p>
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
            <form action={registerMatchResult} className="mt-4 grid gap-3">
              <input type="hidden" name="seasonId" value={season?.id ?? ""} />
              <label className="grid gap-1">
                <span className="label">Winner</span>
                <select className="field" name="winnerId" required>
                  {ladder.map((entry) => (
                    <option key={entry.userId} value={entry.userId}>
                      {entry.user.username}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1">
                <span className="label">Loser</span>
                <select className="field" name="loserId" required>
                  {ladder.map((entry) => (
                    <option key={entry.userId} value={entry.userId}>
                      {entry.user.username}
                    </option>
                  ))}
                </select>
              </label>
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
              <label className="grid gap-1">
                <span className="label">Challenge</span>
                <select className="field" name="challengeId" defaultValue="">
                  <option value="">No related challenge</option>
                  {openChallenges.map((challenge) => (
                    <option key={challenge.id} value={challenge.id}>
                      {challenge.challenger.username} vs {challenge.challenged.username}
                    </option>
                  ))}
                </select>
              </label>
              <button className="button" type="submit" disabled={!season || ladder.length < 2}>
                Save result
              </button>
            </form>
          </section>

          <section className="section-band">
            <h2 className="text-xl font-black">Create season</h2>
            <form action={createSeason} className="mt-4 grid gap-3">
              <label className="grid gap-1">
                <span className="label">Name</span>
                <input className="field" name="name" placeholder="2026 Club Ladder" required />
              </label>
              <label className="grid gap-1">
                <span className="label">Year</span>
                <input className="field" name="year" type="number" defaultValue={new Date().getFullYear()} required />
              </label>
              <label className="grid gap-1">
                <span className="label">Start date</span>
                <input className="field" name="startsAt" type="date" defaultValue={today} required />
              </label>
              <label className="grid gap-1">
                <span className="label">End date</span>
                <input className="field" name="endsAt" type="date" />
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input name="isActive" type="checkbox" defaultChecked />
                Active season
              </label>
              <button className="button" type="submit">
                Create season
              </button>
            </form>
          </section>
        </aside>
      </div>
    </main>
  );
}
