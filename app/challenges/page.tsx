import { cookies } from "next/headers";
import { EmptyState } from "@/components/EmptyState";
import { PlayerCombobox } from "@/components/PlayerCombobox";
import { StatusBadge } from "@/components/StatusBadge";
import { acceptChallenge, createChallenge, declineChallenge } from "@/lib/actions";
import { canChallengePlayer } from "@/lib/challenge-rules";
import { getPublicPlayerNames } from "@/lib/display-name";
import { compactDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getActiveSeason, getLadder } from "@/lib/queries";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ChallengesPage() {
  const session = await verifySessionToken(cookies().get(SESSION_COOKIE_NAME)?.value);
  const season = await getActiveSeason();
  const ladder = season ? await getLadder(season.id) : [];
  const currentPlayer = session ? ladder.find((entry) => entry.userId === session.sub) : null;
  const rawChallenges = season
    ? await prisma.challenge.findMany({
        where: { seasonId: season.id },
        include: { challenger: true, challenged: true, match: true },
        orderBy: { createdAt: "desc" }
      })
    : [];
  const challenges = [...rawChallenges].sort((left, right) => {
    const leftNeedsResponse = isIncomingPendingChallenge(left, session?.sub);
    const rightNeedsResponse = isIncomingPendingChallenge(right, session?.sub);

    if (leftNeedsResponse === rightNeedsResponse) {
      return right.createdAt.getTime() - left.createdAt.getTime();
    }

    return leftNeedsResponse ? -1 : 1;
  });
  const publicNames = getPublicPlayerNames(
    uniqueUsers([
      ...ladder.map((entry) => entry.user),
      ...challenges.flatMap((challenge) => [challenge.challenger, challenge.challenged])
    ])
  );
  const challengeTargets = currentPlayer
    ? ladder.filter((entry) => entry.userId !== currentPlayer.userId && canChallengePlayer(currentPlayer, entry))
    : [];
  const challengeOptions = challengeTargets.map((entry) => ({
    id: entry.userId,
    label: `${publicNames.get(entry.userId) ?? entry.user.username} (#${entry.currentRank})`,
    detail: `${entry.points} pts`
  }));
  const currentPlayerName = currentPlayer
    ? publicNames.get(currentPlayer.userId) ?? currentPlayer.user.username
    : session?.username ?? "";

  return (
    <main className="page-shell">
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="section-band">
          <p className="label">Challenges</p>
          <h1 className="mt-1 text-3xl font-black">Challenge board</h1>

          <div className="mt-6 grid gap-3">
            {challenges.length === 0 ? (
              <EmptyState
                title="No challenges yet"
                body="Create a challenge against a player up to 3 positions above, or against tied players within 3 positions."
              />
            ) : (
              challenges.map((challenge) => {
                const needsResponse = isIncomingPendingChallenge(challenge, session?.sub);

                return (
                  <article
                    id={challenge.id}
                    key={challenge.id}
                    className={`rounded-lg border bg-white transition ${
                      needsResponse
                        ? "border-court-500 bg-court-50 p-5 shadow-soft sm:p-6"
                        : "border-line p-4"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        {needsResponse ? (
                          <p className="mb-2 inline-flex rounded-full bg-court-700 px-2.5 py-1 text-xs font-black text-white">
                            Needs your response
                          </p>
                        ) : null}
                        <p className={needsResponse ? "text-xl font-black" : "text-lg font-black"}>
                          {publicNames.get(challenge.challengerId) ?? challenge.challenger.username}{" "}
                          <span className="font-bold text-stone-500">challenges</span>{" "}
                          {publicNames.get(challenge.challengedId) ?? challenge.challenged.username}
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
                          <button className={needsResponse ? "button" : "button-secondary"} type="submit">
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
                );
              })
            )}
          </div>
        </section>

        <aside className="section-band self-start">
          <h2 className="text-xl font-black">Create challenge</h2>
          {!session ? (
            <p className="mt-3 text-sm text-stone-600">Log in before creating challenges.</p>
          ) : !season || !currentPlayer ? (
            <p className="mt-3 text-sm text-stone-600">Join the active season before creating challenges.</p>
          ) : (
            <form action={createChallenge} className="mt-4 grid gap-3">
              <input type="hidden" name="seasonId" value={season.id} />
              <label className="grid gap-1">
                <span className="label">Challenger</span>
                <input className="field" value={currentPlayerName} readOnly />
              </label>
              <PlayerCombobox
                name="challengedId"
                label="Challenged player"
                players={challengeOptions}
                disabled={challengeOptions.length === 0}
              />
              <button className="button" type="submit" disabled={challengeOptions.length === 0}>
                Create challenge
              </button>
            </form>
          )}
        </aside>
      </div>
    </main>
  );
}

function uniqueUsers<T extends { id: string }>(users: T[]) {
  return Array.from(new Map(users.map((user) => [user.id, user])).values());
}

function isIncomingPendingChallenge(challenge: { challengedId: string; status: string }, userId?: string) {
  return Boolean(userId && challenge.challengedId === userId && challenge.status === "Pending");
}
