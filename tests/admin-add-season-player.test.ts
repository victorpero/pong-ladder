import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

type UserRow = { id: string; username: string; isApproved: boolean; isAdmin: boolean };
type SeasonRow = { id: string; isActive: boolean };
type SeasonPlayerRow = { id: string; seasonId: string; userId: string; points: number; currentRank: number };

const state = vi.hoisted(() => ({
  session: null as { sub: string } | null,
  users: [] as UserRow[],
  seasons: [] as SeasonRow[],
  seasonPlayers: [] as SeasonPlayerRow[],
  createError: null as unknown
}));

vi.mock("next/headers", () => ({
  cookies: () => ({ get: () => ({ value: "session-token" }) })
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn()
}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }
}));

vi.mock("@/lib/session", () => ({
  SESSION_COOKIE_NAME: "pong_session",
  verifySessionToken: async () => state.session
}));

vi.mock("@/lib/prisma", () => {
  const db = {
    user: {
      findUnique: async ({ where }: { where: { id: string } }) => state.users.find((user) => user.id === where.id) ?? null,
      findFirst: async ({ where }: { where: { id: string } }) => {
        const user = state.users.find((candidate) => candidate.id === where.id);

        return user && (user.isApproved || user.isAdmin) ? user : null;
      }
    },
    season: {
      findUnique: async ({ where }: { where: { id: string } }) => state.seasons.find((season) => season.id === where.id) ?? null
    },
    seasonPlayer: {
      findUnique: async ({ where }: { where: { seasonId_userId: { seasonId: string; userId: string } } }) =>
        state.seasonPlayers.find(
          (player) => player.seasonId === where.seasonId_userId.seasonId && player.userId === where.seasonId_userId.userId
        ) ?? null,
      aggregate: async ({ where }: { where: { seasonId: string } }) => {
        const ranks = state.seasonPlayers
          .filter((player) => player.seasonId === where.seasonId)
          .map((player) => player.currentRank);

        return { _max: { currentRank: ranks.length > 0 ? Math.max(...ranks) : null } };
      },
      create: async ({ data }: { data: Omit<SeasonPlayerRow, "id"> }) => {
        if (state.createError) {
          throw state.createError;
        }

        const created = { id: `season-player-${state.seasonPlayers.length + 1}`, ...data };
        state.seasonPlayers.push(created);

        return created;
      }
    },
    $transaction: async (run: (tx: unknown) => Promise<unknown>) => run(db)
  };

  return { prisma: db };
});

const { adminAddSeasonPlayer } = await import("@/lib/admin-actions");
const { alreadyInSeasonMessage } = await import("@/lib/season-membership");

function addSeasonPlayerForm(seasonId: string, userId: string) {
  const formData = new FormData();
  formData.set("seasonId", seasonId);
  formData.set("userId", userId);

  return formData;
}

function seasonPlayersFor(seasonId: string) {
  return state.seasonPlayers.filter((player) => player.seasonId === seasonId);
}

beforeEach(() => {
  state.session = { sub: "admin-1" };
  state.createError = null;
  state.users = [
    { id: "admin-1", username: "root", isApproved: true, isAdmin: true },
    { id: "player-1", username: "anders", isApproved: true, isAdmin: false },
    { id: "player-2", username: "peter", isApproved: true, isAdmin: false },
    { id: "pending-1", username: "kalle", isApproved: false, isAdmin: false }
  ];
  state.seasons = [
    { id: "season-active", isActive: true },
    { id: "season-past", isActive: false }
  ];
  state.seasonPlayers = [
    { id: "season-player-existing", seasonId: "season-active", userId: "player-2", points: 12, currentRank: 1 }
  ];
});

describe("adminAddSeasonPlayer authorization", () => {
  it("rejects a signed-in player who is not an admin", async () => {
    state.session = { sub: "player-1" };

    await expect(adminAddSeasonPlayer({}, addSeasonPlayerForm("season-active", "player-1"))).rejects.toThrow(
      "Admin access required."
    );
    expect(seasonPlayersFor("season-active")).toHaveLength(1);
  });

  it("sends a signed-out caller to the login page", async () => {
    state.session = null;

    await expect(adminAddSeasonPlayer({}, addSeasonPlayerForm("season-active", "player-1"))).rejects.toThrow(
      "REDIRECT:/login?next=/admin"
    );
    expect(seasonPlayersFor("season-active")).toHaveLength(1);
  });
});

describe("adminAddSeasonPlayer", () => {
  it("adds an approved player to the active season exactly once", async () => {
    const result = await adminAddSeasonPlayer({}, addSeasonPlayerForm("season-active", "player-1"));

    expect(result).toEqual({ success: "anders was added to the season." });
    expect(seasonPlayersFor("season-active").filter((player) => player.userId === "player-1")).toHaveLength(1);
  });

  it("places the new player at the bottom of the ladder with no points", async () => {
    state.seasonPlayers.push({
      id: "season-player-gap",
      seasonId: "season-active",
      userId: "admin-1",
      points: 4,
      currentRank: 7
    });

    await adminAddSeasonPlayer({}, addSeasonPlayerForm("season-active", "player-1"));

    const added = seasonPlayersFor("season-active").find((player) => player.userId === "player-1");

    expect(added).toMatchObject({ currentRank: 8, points: 0 });
  });

  it("rejects a player who already joined the season", async () => {
    const result = await adminAddSeasonPlayer({}, addSeasonPlayerForm("season-active", "player-2"));

    expect(result).toEqual({ error: alreadyInSeasonMessage });
    expect(seasonPlayersFor("season-active")).toHaveLength(1);
  });

  it("reports a duplicate when the unique constraint rejects a concurrent insert", async () => {
    state.createError = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
      code: "P2002",
      clientVersion: "5.22.0"
    });

    const result = await adminAddSeasonPlayer({}, addSeasonPlayerForm("season-active", "player-1"));

    expect(result).toEqual({ error: alreadyInSeasonMessage });
  });

  it("leaves finished seasons alone", async () => {
    const result = await adminAddSeasonPlayer({}, addSeasonPlayerForm("season-past", "player-1"));

    expect(result).toEqual({ error: "Players can only be added to the active season." });
    expect(seasonPlayersFor("season-past")).toHaveLength(0);
  });

  it("rejects a player who is still awaiting approval", async () => {
    const result = await adminAddSeasonPlayer({}, addSeasonPlayerForm("season-active", "pending-1"));

    expect(result).toEqual({ error: "Select an approved player." });
    expect(seasonPlayersFor("season-active")).toHaveLength(1);
  });

  it("rejects a submission without a selected player", async () => {
    const formData = new FormData();
    formData.set("seasonId", "season-active");
    formData.set("userId", "");

    expect(await adminAddSeasonPlayer({}, formData)).toEqual({ error: "Select a player to add to the season." });
    expect(seasonPlayersFor("season-active")).toHaveLength(1);
  });
});
