import { beforeEach, describe, expect, it, vi } from "vitest";

type MatchRow = { organizationId: string; winnerTeamId: string | null; loserTeamId: string | null };

const state = vi.hoisted(() => ({
  memberTeamIds: [] as string[],
  matches: [] as MatchRow[],
  teams: [] as string[]
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
  requireOrganizationUser: async () => ({
    session: { sub: "user-1" },
    organization: { id: "org-polisen", slug: "polisen" }
  })
}));

vi.mock("@/lib/prisma", () => {
  const matchesClause = (match: MatchRow, clause: Record<string, string>) =>
    Object.entries(clause).every(([key, value]) => match[key as keyof MatchRow] === value);

  const db = {
    membership: {
      count: async ({ where }: { where: { teamId: string } }) =>
        state.memberTeamIds.filter((teamId) => teamId === where.teamId).length
    },
    match: {
      count: async ({ where }: { where: { organizationId: string; OR: Array<Record<string, string>> } }) =>
        state.matches.filter(
          (match) => match.organizationId === where.organizationId && where.OR.some((clause) => matchesClause(match, clause))
        ).length
    },
    team: {
      deleteMany: async ({ where }: { where: { id: string } }) => {
        const remaining = state.teams.filter((teamId) => teamId !== where.id);
        const count = state.teams.length - remaining.length;
        state.teams = remaining;

        return { count };
      }
    },
    $transaction: async (run: (tx: unknown) => Promise<unknown>) => run(db)
  };

  return { prisma: db };
});

const { deleteTeam } = await import("@/lib/actions");

function deleteForm(teamId: string) {
  const formData = new FormData();
  formData.set("organizationSlug", "polisen");
  formData.set("teamId", teamId);

  return formData;
}

function playedMatch(overrides: Partial<MatchRow>): MatchRow {
  return { organizationId: "org-polisen", winnerTeamId: null, loserTeamId: null, ...overrides };
}

beforeEach(() => {
  state.memberTeamIds = [];
  state.matches = [];
  state.teams = ["team-red", "team-blue"];
});

describe("deleteTeam", () => {
  it("deletes an empty team that never played", async () => {
    await deleteTeam(deleteForm("team-red"));

    expect(state.teams).toEqual(["team-blue"]);
  });

  it("keeps a team that won a recorded match", async () => {
    state.matches = [playedMatch({ winnerTeamId: "team-red", loserTeamId: "team-blue" })];

    await expect(deleteTeam(deleteForm("team-red"))).rejects.toThrow("Teams with recorded match results cannot be deleted.");
    expect(state.teams).toContain("team-red");
  });

  it("keeps a team that lost a recorded match", async () => {
    state.matches = [playedMatch({ winnerTeamId: "team-blue", loserTeamId: "team-red" })];

    await expect(deleteTeam(deleteForm("team-red"))).rejects.toThrow("Teams with recorded match results cannot be deleted.");
    expect(state.teams).toContain("team-red");
  });

  it("keeps a team whose only match was an internal game", async () => {
    state.matches = [playedMatch({ winnerTeamId: "team-red", loserTeamId: "team-red" })];

    await expect(deleteTeam(deleteForm("team-red"))).rejects.toThrow("Teams with recorded match results cannot be deleted.");
  });

  it("ignores results recorded for another team", async () => {
    state.matches = [playedMatch({ winnerTeamId: "team-blue", loserTeamId: null })];

    await deleteTeam(deleteForm("team-red"));

    expect(state.teams).toEqual(["team-blue"]);
  });

  it("still refuses to delete a team that has members", async () => {
    state.memberTeamIds = ["team-red"];

    await expect(deleteTeam(deleteForm("team-red"))).rejects.toThrow("Only teams without members can be deleted.");
  });
});
