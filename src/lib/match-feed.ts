import type { Prisma } from "@prisma/client";

/**
 * Results are ordered by when they were registered rather than by the date they
 * were played, so backdating a match never pushes a fresh registration below
 * older ones. The match id breaks ties when two results share a timestamp.
 */
export const matchFeedOrderBy: Prisma.MatchOrderByWithRelationInput[] = [{ createdAt: "desc" }, { id: "desc" }];

export function sortByRegistration<T extends { id: string; createdAt: Date }>(matches: T[]) {
  return [...matches].sort(
    (left, right) => right.createdAt.getTime() - left.createdAt.getTime() || right.id.localeCompare(left.id)
  );
}
