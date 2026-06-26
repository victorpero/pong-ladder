import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { acceptChallenge, createChallenge, declineChallenge } from "@/lib/actions";
import { compactDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getActiveSeason, getLadder } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ChallengesPage() {
  const season = await getActiveSeason();
  const ladder = season ? await getLadder(season.id) : [];
  const challenges = season
    ? await prisma.challenge.findMany({
        where: { seasonId: season.id },
        include: { challenger: true, challenged: true, match: true },
        orderBy: { createdAt: "desc" }
      })
    : [];

  return (
    <main className="page-shell">
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="section-band">
          <p className="label">Challenges</p>
          <h1 className="mt-1 text-3xl font-black">Challenge board</h1>

          <div className="mt-6 grid gap-3">
            {challenges.length === 0 ? (
              <EmptyState title="No challenges yet" body="Create a challenge against a player up to 3 positions above." />
            ) : (
              challenges.map((challenge) => (
                <article key={challenge.id} className="rounded-lg border border-line bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-black">
                        {challenge.challenger.username} challenges {challenge.challenged.username}
                      </p>
                      <p className="text-sm text-stone-500">
                        {compactDate(challenge.createdAt)} · declines: {challenge.declinedCount}
                      </p>
                    </div>
                    <StatusBadge status={challenge.status} />
                  </div>

                  {challenge.status === "Pending" ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <form action={acceptChallenge}>
                        <input type="hidden" name="challengeId" value={challenge.id} />
                        <button className="button-secondary" type="submit">
                          Accept
                        </button>
                      </form>
                      <form action={declineChallenge}>
                        <input type="hidden" name="challengeId" value={challenge.id} />
                        <button className="button-secondary" type="submit">
                          Decline
                        </button>
                      </form>
                    </div>
                  ) : null}
                </article>
              ))
            )}
          </div>
        </section>

        <aside className="section-band self-start">
          <h2 className="text-xl font-black">Create challenge</h2>
          <form action={createChallenge} className="mt-4 grid gap-3">
            <input type="hidden" name="seasonId" value={season?.id ?? ""} />
            <label className="grid gap-1">
              <span className="label">Challenger</span>
              <select className="field" name="challengerId" required>
                {ladder.map((entry) => (
                  <option key={entry.userId} value={entry.userId}>
                    #{entry.currentRank} {entry.user.username}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1">
              <span className="label">Challenged player</span>
              <select className="field" name="challengedId" required>
                {ladder.map((entry) => (
                  <option key={entry.userId} value={entry.userId}>
                    #{entry.currentRank} {entry.user.username}
                  </option>
                ))}
              </select>
            </label>
            <button className="button" type="submit" disabled={!season || ladder.length < 2}>
              Create challenge
            </button>
          </form>
        </aside>
      </div>
    </main>
  );
}
