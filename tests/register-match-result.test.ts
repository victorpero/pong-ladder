import { ChallengeStatus, Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

type ChallengeRow = {
  id: string;
  organizationId: string;
  seasonId: string;
  challengerId: string;
  challengedId: string;
  status: ChallengeStatus;
  completedAt: Date | null;
};

type SeasonPlayerRow = {
  id: string;
  seasonId: string;
  organizationId: string;
  userId: string;
  points: number;
};

type MatchRow = {
  seasonId: string;
  winnerId: string;
  loserId: string;
  loserSets: number;
  challengeId: string | null;
};

const state = vi.hoisted(() => ({
  session: { sub: "me" } as { sub: string } | null,
  isAdmin: false,
  challenges: [] as ChallengeRow[],
  seasonPlayers: [] as SeasonPlayerRow[],
  matches: [] as MatchRow[],
  rankRecalculations: [] as string[],
  /** Stands in for a driver or database failure that must not reach the browser. */
  failWithUnexpectedError: false,
  /** Stands in for another participant closing the challenge mid-transaction. */
  onBeforeChallengeUpdate: null as (() => void) | null
}));

vi.mock("@/lib/challenge-notifications", () => ({
  notifyChallengedPlayer: vi.fn()
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
      // Shaped like the error redirect() throws, which Next has to receive intact.
      throw Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT;replace;/login;307;" });
    }

    return { session: state.session, organization: { id: "org-polisen", slug: "polisen" } };
  },
  requireOrganizationAdmin: async () => ({
    session: state.session,
    organization: { id: "org-polisen", slug: "polisen" }
  })
}));

vi.mock("@/lib/rate-limit", () => ({
  consumeRateLimit: vi.fn(),
  getClientRateLimitKey: () => "test-key"
}));

vi.mock("@/lib/rankings", () => ({
  recalculateRanks: async (_tx: unknown, seasonId: string) => {
    state.rankRecalculations.push(seasonId);
  }
}));

vi.mock("@/lib/prisma", () => {
  const uniqueViolation = () =>
    new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
      code: "P2002",
      clientVersion: "5.22.0"
    });

  const db = {
    membership: {
      findUnique: async () => ({
        role: state.isAdmin ? "ADMIN" : "PLAYER",
        status: "ACTIVE"
      })
    },
    season: {
      findFirst: async ({ where }: { where: { id: string; organizationId: string } }) =>
        where.id === "season-1" && where.organizationId === "org-polisen"
          ? { id: "season-1", organizationId: "org-polisen" }
          : null
    },
    challenge: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        state.challenges.find((challenge) => challenge.id === where.id) ?? null,
      updateMany: async ({
        where,
        data
      }: {
        where: { id: string; status?: ChallengeStatus };
        data: Partial<ChallengeRow>;
      }) => {
        state.onBeforeChallengeUpdate?.();

        const matched = state.challenges.filter(
          (challenge) => challenge.id === where.id && (!where.status || challenge.status === where.status)
        );

        for (const challenge of matched) {
          Object.assign(challenge, data);
        }

        return { count: matched.length };
      }
    },
    seasonPlayer: {
      findUnique: async ({ where }: { where: { seasonId_userId: { seasonId: string; userId: string } } }) =>
        state.seasonPlayers.find(
          (player) =>
            player.seasonId === where.seasonId_userId.seasonId && player.userId === where.seasonId_userId.userId
        ) ?? null,
      update: async ({ where, data }: { where: { id: string }; data: { points: number } }) => {
        const player = state.seasonPlayers.find((entry) => entry.id === where.id);

        if (player) {
          player.points = data.points;
        }

        return player;
      }
    },
    match: {
      create: async ({ data }: { data: MatchRow }) => {
        if (state.failWithUnexpectedError) {
          throw new Error(unexpectedDatabaseFailure);
        }

        // Models the unique match-per-challenge index.
        if (data.challengeId && state.matches.some((match) => match.challengeId === data.challengeId)) {
          throw uniqueViolation();
        }

        state.matches.push(data);

        return data;
      }
    },
    $transaction: async (run: (tx: unknown) => Promise<unknown>) => {
      const snapshot = {
        challenges: state.challenges.map((challenge) => ({ ...challenge })),
        seasonPlayers: state.seasonPlayers.map((player) => ({ ...player })),
        matches: state.matches.map((match) => ({ ...match }))
      };

      try {
        return await run(db);
      } catch (error) {
        state.challenges = snapshot.challenges;
        state.seasonPlayers = snapshot.seasonPlayers;
        state.matches = snapshot.matches;

        throw error;
      }
    }
  };

  return { prisma: db };
});

const unexpectedDatabaseFailure =
  'Invalid `prisma.match.create()` invocation: connect ECONNREFUSED 127.0.0.1:5432';

const { registerMatchResult, submitMatchResult } = await import("@/lib/actions");
const { staleChallengeResultMessage, unreportableChallengeMessage } = await import("@/lib/challenge-rules");

function resultForm(overrides: Partial<Record<string, string>> = {}) {
  const formData = new FormData();
  const fields = {
    organizationSlug: "polisen",
    seasonId: "season-1",
    challengeId: "challenge-1",
    winnerId: "me",
    loserId: "rival",
    loserSets: "1",
    playedAt: "2026-03-04",
    ...overrides
  };

  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }

  return formData;
}

function challengeRow(overrides: Partial<ChallengeRow> = {}): ChallengeRow {
  return {
    id: "challenge-1",
    organizationId: "org-polisen",
    seasonId: "season-1",
    challengerId: "me",
    challengedId: "rival",
    status: ChallengeStatus.Accepted,
    completedAt: null,
    ...overrides
  };
}

beforeEach(() => {
  state.session = { sub: "me" };
  state.isAdmin = false;
  state.challenges = [challengeRow()];
  state.seasonPlayers = [
    { id: "sp-me", seasonId: "season-1", organizationId: "org-polisen", userId: "me", points: 20 },
    { id: "sp-rival", seasonId: "season-1", organizationId: "org-polisen", userId: "rival", points: 26 },
    { id: "sp-other", seasonId: "season-1", organizationId: "org-polisen", userId: "other", points: 10 }
  ];
  state.matches = [];
  state.rankRecalculations = [];
  state.failWithUnexpectedError = false;
  state.onBeforeChallengeUpdate = null;
});

describe("registerMatchResult from an accepted challenge", () => {
  it("records the result, completes the challenge and recalculates ranks", async () => {
    await registerMatchResult(resultForm());

    expect(state.matches).toHaveLength(1);
    expect(state.matches[0]).toMatchObject({ winnerId: "me", loserId: "rival", loserSets: 1, challengeId: "challenge-1" });
    expect(state.challenges[0].status).toBe(ChallengeStatus.Completed);
    expect(state.challenges[0].completedAt).toBeInstanceOf(Date);
    expect(state.seasonPlayers[0].points).toBeGreaterThan(20);
    expect(state.rankRecalculations).toEqual(["season-1"]);
  });

  it("lets the challenged player report the result as well", async () => {
    state.session = { sub: "rival" };

    await registerMatchResult(resultForm({ winnerId: "rival", loserId: "me" }));

    expect(state.matches).toHaveLength(1);
    expect(state.challenges[0].status).toBe(ChallengeStatus.Completed);
  });

  it("rejects a second submission once the challenge is completed", async () => {
    await registerMatchResult(resultForm());

    await expect(registerMatchResult(resultForm())).rejects.toThrow(unreportableChallengeMessage);
    expect(state.matches).toHaveLength(1);
    expect(state.rankRecalculations).toEqual(["season-1"]);
  });

  it("rejects the loser of a concurrent submission race", async () => {
    // Both requests read an accepted challenge; the unique index rejects the second match.
    state.matches = [{ seasonId: "season-1", winnerId: "rival", loserId: "me", loserSets: 0, challengeId: "challenge-1" }];

    await expect(registerMatchResult(resultForm())).rejects.toThrow(staleChallengeResultMessage);
    expect(state.matches).toHaveLength(1);
  });

  it("rolls back when the challenge is closed between the read and the write", async () => {
    state.onBeforeChallengeUpdate = () => {
      state.challenges[0].status = ChallengeStatus.Forfeit;
    };

    await expect(registerMatchResult(resultForm())).rejects.toThrow(staleChallengeResultMessage);
    expect(state.matches).toEqual([]);
    expect(state.seasonPlayers[0].points).toBe(20);
  });

  it("rejects a challenge that has not been accepted yet", async () => {
    state.challenges = [challengeRow({ status: ChallengeStatus.Pending })];

    await expect(registerMatchResult(resultForm())).rejects.toThrow(unreportableChallengeMessage);
    expect(state.matches).toEqual([]);
  });

  it("rejects a challenge that belongs to another organization", async () => {
    state.challenges = [challengeRow({ organizationId: "org-other" })];

    await expect(registerMatchResult(resultForm())).rejects.toThrow("same season and players");
    expect(state.matches).toEqual([]);
  });

  it("rejects a challenge from another season", async () => {
    state.challenges = [challengeRow({ seasonId: "season-0" })];

    await expect(registerMatchResult(resultForm())).rejects.toThrow("same season and players");
    expect(state.matches).toEqual([]);
  });

  it("rejects players who are not part of the challenge", async () => {
    await expect(registerMatchResult(resultForm({ loserId: "other" }))).rejects.toThrow("same season and players");
    expect(state.matches).toEqual([]);
  });

  it("rejects a player who is neither a participant nor an admin", async () => {
    state.session = { sub: "other" };

    await expect(registerMatchResult(resultForm())).rejects.toThrow(
      "Only admins or match participants can register match results."
    );
    expect(state.matches).toEqual([]);
  });

  it("lets an organization admin report a match between two other players", async () => {
    state.session = { sub: "other" };
    state.isAdmin = true;

    await registerMatchResult(resultForm());

    expect(state.matches).toHaveLength(1);
  });

  it("rejects a result where the same player wins and loses", async () => {
    await expect(registerMatchResult(resultForm({ loserId: "me" }))).rejects.toThrow(
      "Winner and loser must be different players."
    );
    expect(state.matches).toEqual([]);
  });

  it("rejects a set count outside the best-of-five range", async () => {
    await expect(registerMatchResult(resultForm({ loserSets: "3" }))).rejects.toThrow();
    expect(state.matches).toEqual([]);
  });

  it("requires a challenge to attach the result to", async () => {
    await expect(registerMatchResult(resultForm({ challengeId: "" }))).rejects.toThrow();
    expect(state.matches).toEqual([]);
  });
});

describe("submitMatchResult form state", () => {
  it("returns an empty state and records the result on success", async () => {
    await expect(submitMatchResult({}, resultForm())).resolves.toEqual({});
    expect(state.matches).toHaveLength(1);
    expect(state.challenges[0].status).toBe(ChallengeStatus.Completed);
  });

  it("reports a challenge another participant already closed as stale", async () => {
    state.challenges = [challengeRow({ status: ChallengeStatus.Completed })];

    await expect(submitMatchResult({}, resultForm())).resolves.toEqual({
      error: unreportableChallengeMessage,
      stale: true
    });
    expect(state.matches).toEqual([]);
  });

  it("reports the loser of a submission race as stale", async () => {
    state.matches = [{ seasonId: "season-1", winnerId: "rival", loserId: "me", loserSets: 0, challengeId: "challenge-1" }];

    await expect(submitMatchResult({}, resultForm())).resolves.toEqual({
      error: staleChallengeResultMessage,
      stale: true
    });
    expect(state.matches).toHaveLength(1);
  });

  it("reports a challenge closed mid-transaction as stale", async () => {
    state.onBeforeChallengeUpdate = () => {
      state.challenges[0].status = ChallengeStatus.Forfeit;
    };

    await expect(submitMatchResult({}, resultForm())).resolves.toEqual({
      error: staleChallengeResultMessage,
      stale: true
    });
    expect(state.matches).toEqual([]);
  });

  it("returns a rule failure without marking the card stale", async () => {
    state.session = { sub: "other" };

    await expect(submitMatchResult({}, resultForm())).resolves.toEqual({
      error: "Only admins or match participants can register match results.",
      stale: false
    });
  });

  it("returns a readable message for invalid form input", async () => {
    await expect(submitMatchResult({}, resultForm({ loserSets: "3" }))).resolves.toEqual({
      error: "Check the winner, loser and result before saving.",
      stale: false
    });
  });

  it("hides an unexpected database failure behind a generic message", async () => {
    state.failWithUnexpectedError = true;

    const result = await submitMatchResult({}, resultForm());

    expect(result).toEqual({ error: "The result could not be saved. Try again.", stale: false });
    expect(result.error).not.toContain("prisma");
    expect(result.error).not.toContain("ECONNREFUSED");
    expect(state.matches).toEqual([]);
  });

  it("still lets the unexpected failure reach the server logs unchanged", async () => {
    state.failWithUnexpectedError = true;

    await expect(registerMatchResult(resultForm())).rejects.toThrow(unexpectedDatabaseFailure);
  });

  it("rethrows the framework redirect instead of rendering it as a form error", async () => {
    state.session = null;

    await expect(submitMatchResult({}, resultForm())).rejects.toMatchObject({ digest: expect.stringContaining("NEXT_REDIRECT") });
  });
});
