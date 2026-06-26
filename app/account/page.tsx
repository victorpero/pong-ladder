import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { StatCard } from "@/components/StatCard";
import { getPublicPlayerName, getPublicPlayerNames } from "@/lib/display-name";
import { compactDate, formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getActiveSeason, getLadder } from "@/lib/queries";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await verifySessionToken(cookies().get(SESSION_COOKIE_NAME)?.value);

  if (!session) {
    redirect("/login?next=/account");
  }

  const [user, season] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.sub }
    }),
    getActiveSeason()
  ]);

  if (!user) {
    redirect("/logout");
  }

  const ladder = season ? await getLadder(season.id) : [];
  const entry = ladder.find((item) => item.userId === user.id);

  const [matches, challenges] = season
    ? await Promise.all([
        prisma.match.findMany({
          where: {
            seasonId: season.id,
            OR: [{ winnerId: user.id }, { loserId: user.id }]
          },
          include: { winner: true, loser: true },
          orderBy: { playedAt: "desc" },
          take: 6
        }),
        prisma.challenge.findMany({
          where: {
            seasonId: season.id,
            OR: [{ challengerId: user.id }, { challengedId: user.id }]
          },
          include: { challenger: true, challenged: true },
          orderBy: { createdAt: "desc" },
          take: 6
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
      <section className="mb-6 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="section-band">
          <p className="label">My account</p>
          <h1 className="mt-1 text-3xl font-black">{publicName}</h1>
          <p className="mt-2 text-sm text-stone-600">{user.email}</p>
          <p className="mt-1 text-sm text-stone-500">Full name: {user.fullName}</p>
          <p className="mt-4 text-sm text-stone-500">Account created {formatDate(user.createdAt)}</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Rank" value={entry ? `#${entry.currentRank}` : "N/A"} />
          <StatCard label="Points" value={entry?.points ?? 0} />
          <StatCard label="Record" value={entry ? `${entry.wins}-${entry.losses}` : "0-0"} />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="section-band">
          <div className="mb-4">
            <p className="label">Recent matches</p>
            <h2 className="mt-1 text-2xl font-black">Your match history</h2>
          </div>
          <div className="grid gap-3">
            {matches.length === 0 ? (
              <EmptyState title="No matches yet" body="Your match results will appear here once they are registered." />
            ) : (
              matches.map((match) => {
                const won = match.winnerId === user.id;

                return (
                  <article key={match.id} className="rounded-lg border border-line bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-black">
                        {won ? "Win" : "Loss"} vs{" "}
                        {publicNames.get(won ? match.loserId : match.winnerId) ??
                          (won ? match.loser.username : match.winner.username)}
                      </p>
                      <p className="text-sm text-stone-500">{compactDate(match.playedAt)}</p>
                    </div>
                    <p className="mt-2 text-sm text-stone-600">
                      {publicNames.get(match.winnerId) ?? match.winner.username} won {match.winnerSets}-{match.loserSets}
                    </p>
                  </article>
                );
              })
            )}
          </div>
        </section>

        <section className="section-band">
          <div className="mb-4">
            <p className="label">Challenges</p>
            <h2 className="mt-1 text-2xl font-black">Your challenge activity</h2>
          </div>
          <div className="grid gap-3">
            {challenges.length === 0 ? (
              <EmptyState title="No challenges yet" body="Challenges involving your account will show up here." />
            ) : (
              challenges.map((challenge) => (
                <article key={challenge.id} className="rounded-lg border border-line bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-black">
                      {publicNames.get(challenge.challengerId) ?? challenge.challenger.username} vs{" "}
                      {publicNames.get(challenge.challengedId) ?? challenge.challenged.username}
                    </p>
                    <StatusBadge status={challenge.status} />
                  </div>
                  <p className="mt-2 text-sm text-stone-500">{compactDate(challenge.createdAt)}</p>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function uniqueUsers<T extends { id: string }>(users: T[]) {
  return Array.from(new Map(users.map((user) => [user.id, user])).values());
}
