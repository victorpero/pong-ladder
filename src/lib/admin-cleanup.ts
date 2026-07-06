import { ChallengeStatus, type Prisma } from "@prisma/client";

export const openChallengeStatuses = [ChallengeStatus.Pending, ChallengeStatus.Accepted];

export function playerMatchWhere(userId: string): Prisma.MatchWhereInput {
  return {
    OR: [{ winnerId: userId }, { loserId: userId }]
  };
}

export function playerChallengeWhere(userId: string): Prisma.ChallengeWhereInput {
  return {
    OR: [{ challengerId: userId }, { challengedId: userId }]
  };
}

export function openPlayerChallengeWhere(userId: string): Prisma.ChallengeWhereInput {
  return {
    ...playerChallengeWhere(userId),
    status: { in: openChallengeStatuses },
    match: null
  };
}

export function uniqueSeasonIds(records: Array<{ seasonId: string }>) {
  return Array.from(new Set(records.map((record) => record.seasonId)));
}
