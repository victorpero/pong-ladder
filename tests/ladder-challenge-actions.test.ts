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
  failCreateWithUniqueViolation: false,
  rateLimited: false,
  notified: [] as string[]
}));

vi.mock("@/lib/challenge-notifications", () => ({
  notifyChallengedPlayer: async (challengeId: string) => {
    state.notified.push(challengeId);
  }
}));

vi.mock("next/headers", () => ({
  cookies: () => ({
    get: (name: string) => ({ value: name === "pong-ladder-locale" ? "en" : "session-token" })
  }),
  headers: () => new Headers()
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

vi.mock("@/lib/rate-limit", async () => {
  const actual = await vi.importActual<typeof import("@/lib/rate-limit")>("@/lib/rate-limit");

  return {
    ...actual,
    getClientRateLimitKey: () => "test-key",
    consumeRateLimit: () => {
      if (state.rateLimited) {
        throw new actual.RateLimitError();
      }
    }
  };
});

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
      for (const key of ["id", "organizationId", "seasonId", "challengerId", "challengedId"] as const) {
        if (where[key] && challenge[key] !== where[key]) {
          return false;
        }
      }

      if (!matchesStatusFilter(challenge, where.status)) {
        return false;
      }

      const orClauses = where.OR as Array<Record<string, string>> | undefined;

      return !orClauses || orClauses.some((clause) => matchesPair(challenge, clause));
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
      },
      updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Partial<ChallengeRow> }) => {
        const matched = findChallenges(where);

        for (const challenge of matched) {
          Object.assign(challenge, data);
        }

        return { count: matched.length };
      }
    },
    $transaction: async (run: (tx: unknown) => Promise<unknown>) => run(db)
  };

  return { prisma: db };
});

const { acceptChallengeFromLadder, challengeFromLadder } = await import("@/lib/actions");
const { getDictionary } = await import("@/lib/i18n/dictionary");

// The inline controls report rejections in the reader's language, so the
// expectations read from the same dictionary the action resolves.
const messages = getDictionary("en").actions.challenge;

function challengeForm(challengedId: string) {
  const formData = new FormData();
  formData.set("organizationSlug", "polisen");
  formData.set("seasonId", "season-1");
  formData.set("challengedId", challengedId);

  return formData;
}

function acceptForm(challengeId: string) {
  const formData = new FormData();
  formData.set("organizationSlug", "polisen");
  formData.set("challengeId", challengeId);

  return formData;
}

/**
 * Builds a season ladder from point totals in display order. Named players take
 * the first row holding their point total; the rest are filler. Eligibility is
 * derived from points, so ties collapse into one position exactly as they do in
 * the database-backed ladder.
 */
function ladderOf(points: number[], named: Record<string, number>): LadderRow[] {
  const remaining = new Map(Object.entries(named));

  return points.map((value, index) => {
    const userId = Array.from(remaining.entries()).find(([, namedPoints]) => namedPoints === value)?.[0];

    if (userId) {
      remaining.delete(userId);
    }

    return { userId: userId ?? `filler-${index + 1}`, currentRank: index + 1, points: value };
  });
}

function challengeRow(challengerId: string, challengedId: string, status: ChallengeStatus): ChallengeRow {
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
  state.rateLimited = false;
  // Positions 1..7 by points: rival sits one above the viewer, distant four below.
  state.ladder = ladderOf([40, 32, 26, 20, 12, 8, 4], { rival: 32, me: 26, distant: 4 });
  state.challenges = [];
  state.notified = [];
});

describe("challengeFromLadder", () => {
  it("creates the challenge and reports no error", async () => {
    const result = await challengeFromLadder({}, challengeForm("rival"));

    expect(result).toEqual({});
    expect(state.challenges).toMatchObject([{ challengerId: "me", challengedId: "rival", status: ChallengeStatus.Pending }]);
    expect(state.notified).toEqual(["challenge-1"]);
  });

  it("reports the duplicate instead of creating a second challenge", async () => {
    state.challenges = [challengeRow("me", "rival", ChallengeStatus.Pending)];

    const result = await challengeFromLadder({}, challengeForm("rival"));

    expect(result).toEqual({ error: messages.duplicate });
    expect(state.challenges).toHaveLength(1);
  });

  it("reports the duplicate when the row player challenged first", async () => {
    state.challenges = [challengeRow("rival", "me", ChallengeStatus.Pending)];

    const result = await challengeFromLadder({}, challengeForm("rival"));

    expect(result).toEqual({ error: messages.duplicate });
    expect(state.challenges).toHaveLength(1);
  });

  it("reports the duplicate while the challenge is accepted", async () => {
    state.challenges = [challengeRow("me", "rival", ChallengeStatus.Accepted)];

    const result = await challengeFromLadder({}, challengeForm("rival"));

    expect(result).toEqual({ error: messages.duplicate });
    expect(state.challenges).toHaveLength(1);
  });

  it("allows a new challenge once the previous one has finished", async () => {
    for (const status of [ChallengeStatus.Completed, ChallengeStatus.Declined, ChallengeStatus.Forfeit]) {
      state.challenges = [challengeRow("me", "rival", status)];

      expect(await challengeFromLadder({}, challengeForm("rival"))).toEqual({});
      expect(state.challenges).toHaveLength(2);
    }
  });

  it("refuses a player outside the ladder window", async () => {
    const result = await challengeFromLadder({}, challengeForm("distant"));

    expect(result).toEqual({ error: messages.window });
    expect(state.challenges).toHaveLength(0);
  });

  it("accepts a player the viewer is level on points with", async () => {
    state.ladder = ladderOf([40, 26, 26], { rival: 40, me: 26, tied: 26 });

    expect(await challengeFromLadder({}, challengeForm("tied"))).toEqual({});
    expect(state.challenges).toMatchObject([{ challengerId: "me", challengedId: "tied" }]);
  });

  it("measures the window from shared positions rather than stored row order", async () => {
    // Four players level on points share position 2, so the last of them is one
    // position from the leader even though its stored rank is four rows away.
    state.ladder = [
      { userId: "me", currentRank: 1, points: 40 },
      { userId: "filler-1", currentRank: 2, points: 26 },
      { userId: "filler-2", currentRank: 3, points: 26 },
      { userId: "filler-3", currentRank: 4, points: 26 },
      { userId: "rival", currentRank: 5, points: 26 }
    ];

    expect(await challengeFromLadder({}, challengeForm("rival"))).toEqual({});
    expect(state.challenges).toMatchObject([{ challengerId: "me", challengedId: "rival" }]);
  });

  it("refuses a self-challenge", async () => {
    const result = await challengeFromLadder({}, challengeForm("me"));

    expect(result).toEqual({ error: messages.self });
    expect(state.challenges).toHaveLength(0);
  });

  it("refuses a player who left the season since the ladder was rendered", async () => {
    state.ladder = [{ userId: "me", currentRank: 1, points: 26 }];

    const result = await challengeFromLadder({}, challengeForm("rival"));

    expect(result).toEqual({ error: messages.notInSeason });
    expect(state.challenges).toHaveLength(0);
  });

  it("reports the duplicate to whichever request loses a concurrent race", async () => {
    state.failCreateWithUniqueViolation = true;

    expect(await challengeFromLadder({}, challengeForm("rival"))).toEqual({ error: messages.duplicate });
  });

  it("reports the rate limit that guards repeated submissions", async () => {
    state.rateLimited = true;

    const result = await challengeFromLadder({}, challengeForm("rival"));

    expect(result.error).toMatch(/Too many attempts/);
    expect(state.challenges).toHaveLength(0);
  });

  it("reports a missing opponent instead of throwing", async () => {
    const formData = challengeForm("rival");
    formData.set("challengedId", "");

    const result = await challengeFromLadder({}, formData);

    expect(result.error).toBeTruthy();
    expect(state.challenges).toHaveLength(0);
  });

  it("does not announce a challenge that was never created", async () => {
    state.challenges = [challengeRow("me", "rival", ChallengeStatus.Pending)];

    await challengeFromLadder({}, challengeForm("rival"));

    expect(state.notified).toEqual([]);
  });
});

describe("acceptChallengeFromLadder", () => {
  it("accepts a challenge aimed at the signed-in player", async () => {
    state.challenges = [challengeRow("rival", "me", ChallengeStatus.Pending)];

    const result = await acceptChallengeFromLadder({}, acceptForm("challenge-existing"));

    expect(result).toEqual({});
    expect(state.challenges[0].status).toBe(ChallengeStatus.Accepted);
  });

  it("reports a stale row when the same challenge is accepted twice", async () => {
    state.challenges = [challengeRow("rival", "me", ChallengeStatus.Pending)];

    await acceptChallengeFromLadder({}, acceptForm("challenge-existing"));
    const second = await acceptChallengeFromLadder({}, acceptForm("challenge-existing"));

    expect(second).toEqual({ error: messages.stale });
    expect(state.challenges[0].status).toBe(ChallengeStatus.Accepted);
  });

  it("refuses to accept a challenge the player opened themselves", async () => {
    state.challenges = [challengeRow("me", "rival", ChallengeStatus.Pending)];

    const result = await acceptChallengeFromLadder({}, acceptForm("challenge-existing"));

    expect(result).toEqual({ error: messages.stale });
    expect(state.challenges[0].status).toBe(ChallengeStatus.Pending);
  });

  it("refuses a challenge that finished since the ladder was rendered", async () => {
    state.challenges = [challengeRow("rival", "me", ChallengeStatus.Completed)];

    const result = await acceptChallengeFromLadder({}, acceptForm("challenge-existing"));

    expect(result).toEqual({ error: messages.stale });
    expect(state.challenges[0].status).toBe(ChallengeStatus.Completed);
  });

  it("refuses a challenge id that no longer exists", async () => {
    const result = await acceptChallengeFromLadder({}, acceptForm("challenge-gone"));

    expect(result).toEqual({ error: messages.stale });
  });

  it("reports a missing challenge id instead of throwing", async () => {
    const result = await acceptChallengeFromLadder({}, acceptForm(""));

    expect(result).toEqual({ error: messages.stale });
  });
});
