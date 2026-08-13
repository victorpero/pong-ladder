import { ChallengeStatus, Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

type ChallengeRow = {
  id: string;
  organizationId: string;
  seasonId: string;
  challengerId: string;
  challengedId: string;
  status: ChallengeStatus;
  declinedCount: number;
};

type LadderRow = { userId: string; currentRank: number; points: number };

const state = vi.hoisted(() => ({
  session: null as { sub: string } | null,
  ladder: [] as LadderRow[],
  challenges: [] as ChallengeRow[],
  failCreateWithUniqueViolation: false
}));

vi.mock("next/headers", () => ({
  cookies: () => ({ get: () => ({ value: "session-token" }) })
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }
}));

vi.mock("@/lib/authz", () => ({
  requireOrganizationUser: async () => {
    if (!state.session) {
      throw new Error("REDIRECT:/login");
    }

    return { session: state.session, organization: { id: "org-polisen", slug: "polisen" } };
  }
}));

vi.mock("@/lib/rate-limit", () => ({
  consumeRateLimit: vi.fn(),
  getClientRateLimitKey: () => "test-key"
}));

vi.mock("@/lib/prisma", () => {
  const matchesStatusFilter = (challenge: ChallengeRow, filter: unknown) => {
    if (!filter) {
      return true;
    }

    if (typeof filter === "string") {
      return challenge.status === filter;
    }

    const inList = (filter as { in?: ChallengeStatus[] }).in;

    return inList ? inList.includes(challenge.status) : true;
  };

  const matchesPair = (challenge: ChallengeRow, clause: Record<string, string>) =>
    Object.entries(clause).every(([key, value]) => challenge[key as keyof ChallengeRow] === value);

  const findChallenges = (where: Record<string, unknown>) =>
    state.challenges.filter((challenge) => {
      if (where.seasonId && challenge.seasonId !== where.seasonId) {
        return false;
      }

      if (!matchesStatusFilter(challenge, where.status)) {
        return false;
      }

      const orClauses = where.OR as Array<Record<string, string>> | undefined;

      if (orClauses && !orClauses.some((clause) => matchesPair(challenge, clause))) {
        return false;
      }

      for (const key of ["challengerId", "challengedId"] as const) {
        if (where[key] && challenge[key] !== where[key]) {
          return false;
        }
      }

      return true;
    });

  const db = {
    season: {
      findUnique: async () => ({ id: "season-1", organizationId: "org-polisen" })
    },
    seasonPlayer: {
      findMany: async () => state.ladder
    },
    challenge: {
      findFirst: async ({ where }: { where: Record<string, unknown> }) => findChallenges(where)[0] ?? null,
      count: async ({ where }: { where: Record<string, unknown> }) => findChallenges(where).length,
      create: async ({ data }: { data: Omit<ChallengeRow, "id"> }) => {
        if (state.failCreateWithUniqueViolation) {
          throw new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
            code: "P2002",
            clientVersion: "5.22.0"
          });
        }

        const created = { id: `challenge-${state.challenges.length + 1}`, ...data };
        state.challenges.push(created);

        return created;
      }
    },
    $transaction: async (run: (tx: unknown) => Promise<unknown>) => run(db)
  };

  return { prisma: db };
});

const { createChallenge } = await import("@/lib/actions");
const { duplicateActiveChallengeMessage } = await import("@/lib/challenge-rules");

function challengeForm(challengedId: string) {
  const formData = new FormData();
  formData.set("organizationSlug", "polisen");
  formData.set("seasonId", "season-1");
  formData.set("challengedId", challengedId);

  return formData;
}

function activeChallenge(challengerId: string, challengedId: string, status: ChallengeStatus): ChallengeRow {
  return {
    id: "challenge-existing",
    organizationId: "org-polisen",
    seasonId: "season-1",
    challengerId,
    challengedId,
    status,
    declinedCount: 0
  };
}

beforeEach(() => {
  state.session = { sub: "me" };
  state.failCreateWithUniqueViolation = false;
  state.ladder = [
    { userId: "me", currentRank: 4, points: 20 },
    { userId: "rival", currentRank: 3, points: 26 },
    { userId: "other", currentRank: 5, points: 14 }
  ];
  state.challenges = [];
});

describe("createChallenge duplicate prevention", () => {
  it("creates the first challenge against an eligible opponent", async () => {
    await createChallenge(challengeForm("rival"));

    expect(state.challenges).toHaveLength(1);
    expect(state.challenges[0]).toMatchObject({ challengerId: "me", challengedId: "rival", status: ChallengeStatus.Pending });
  });

  it("rejects a second challenge in the same direction", async () => {
    state.challenges = [activeChallenge("me", "rival", ChallengeStatus.Pending)];

    await expect(createChallenge(challengeForm("rival"))).rejects.toThrow(duplicateActiveChallengeMessage);
    expect(state.challenges).toHaveLength(1);
  });

  it("rejects a reverse challenge against the player who challenged first", async () => {
    state.challenges = [activeChallenge("rival", "me", ChallengeStatus.Pending)];

    await expect(createChallenge(challengeForm("rival"))).rejects.toThrow(duplicateActiveChallengeMessage);
    expect(state.challenges).toHaveLength(1);
  });

  it("keeps rejecting once the challenge has been accepted", async () => {
    state.challenges = [activeChallenge("me", "rival", ChallengeStatus.Accepted)];

    await expect(createChallenge(challengeForm("rival"))).rejects.toThrow(duplicateActiveChallengeMessage);
    expect(state.challenges).toHaveLength(1);
  });

  it("keeps rejecting a reverse challenge once accepted", async () => {
    state.challenges = [activeChallenge("rival", "me", ChallengeStatus.Accepted)];

    await expect(createChallenge(challengeForm("rival"))).rejects.toThrow(duplicateActiveChallengeMessage);
    expect(state.challenges).toHaveLength(1);
  });

  it("allows a new challenge once the previous one is no longer active", async () => {
    for (const status of [ChallengeStatus.Declined, ChallengeStatus.Completed, ChallengeStatus.Forfeit]) {
      state.challenges = [activeChallenge("me", "rival", status)];

      await createChallenge(challengeForm("rival"));

      expect(state.challenges).toHaveLength(2);
    }
  });

  it("allows a new challenge after a historical reverse challenge finished", async () => {
    state.challenges = [activeChallenge("rival", "me", ChallengeStatus.Completed)];

    await createChallenge(challengeForm("rival"));

    expect(state.challenges).toHaveLength(2);
  });

  it("does not block challenges against a different opponent", async () => {
    state.challenges = [activeChallenge("me", "rival", ChallengeStatus.Pending)];

    await createChallenge(challengeForm("other"));

    expect(state.challenges.filter((challenge) => challenge.challengedId === "other")).toHaveLength(1);
  });

  it("rejects the loser of a concurrent creation race", async () => {
    // Both requests pass the lookup; the unique index rejects the second insert.
    state.failCreateWithUniqueViolation = true;

    await expect(createChallenge(challengeForm("rival"))).rejects.toThrow(duplicateActiveChallengeMessage);
  });

  it("still blocks self-challenges", async () => {
    await expect(createChallenge(challengeForm("me"))).rejects.toThrow("Players cannot challenge themselves.");
  });

  it("still enforces the ladder window", async () => {
    state.ladder = [
      { userId: "me", currentRank: 9, points: 5 },
      { userId: "rival", currentRank: 1, points: 40 }
    ];

    await expect(createChallenge(challengeForm("rival"))).rejects.toThrow(/3 ladder positions/);
    expect(state.challenges).toHaveLength(0);
  });
});
