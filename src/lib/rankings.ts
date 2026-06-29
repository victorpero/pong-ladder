import type { Prisma } from "@prisma/client";

type TransactionClient = Prisma.TransactionClient;

export async function recalculateRanks(tx: TransactionClient, seasonId: string) {
  const players = await tx.seasonPlayer.findMany({
    where: { seasonId },
    orderBy: [{ points: "desc" }, { joinedAt: "asc" }],
    select: { id: true }
  });

  await Promise.all(
    players.map((player, index) =>
      tx.seasonPlayer.update({
        where: { id: player.id },
        data: { currentRank: -(index + 1) }
      })
    )
  );

  await Promise.all(
    players.map((player, index) =>
      tx.seasonPlayer.update({
        where: { id: player.id },
        data: { currentRank: index + 1 }
      })
    )
  );
}

