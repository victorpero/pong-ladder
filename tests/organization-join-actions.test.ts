import {
  MembershipJoinMethod,
  MembershipStatus,
  OrganizationJoinPolicy,
  type Organization
} from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashOrganizationAccessCode } from "@/lib/organization-access-code";

type OrganizationRow = Pick<
  Organization,
  "id" | "slug" | "name" | "joinPolicy" | "allowedEmailDomains" | "accessCodeHash" | "accessCodeEnabled"
>;

type MembershipRow = {
  id: string;
  userId: string;
  organizationId: string;
  status: MembershipStatus;
  joinMethod: MembershipJoinMethod;
  activatedAt: Date | null;
  reviewedAt: Date | null;
  reviewedById: string | null;
};

const state = vi.hoisted(() => ({
  user: {
    id: "user-1",
    username: "player",
    email: "player@example.com",
    emailVerifiedAt: new Date("2026-01-01")
  },
  organizations: [] as OrganizationRow[],
  memberships: [] as MembershipRow[],
  rateLimited: false
}));

const rateLimit = vi.hoisted(() => ({
  ErrorClass: class RateLimitError extends Error {
    constructor() {
      super("Too many attempts. Please wait a bit and try again.");
    }
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
  verifyEmailPath: (locale: string) => `/${locale}/verify-email`,
  requireAuthenticatedUser: async () => ({
    session: { sub: state.user.id },
    user: state.user
  })
}));
vi.mock("@/lib/rate-limit", () => ({
  RateLimitError: rateLimit.ErrorClass,
  getClientRateLimitKey: () => "organization-code:client:test",
  consumeRateLimit: () => {
    if (state.rateLimited) {
      throw new rateLimit.ErrorClass();
    }
  }
}));

vi.mock("@/lib/prisma", () => {
  const membership = {
    findUnique: async ({ where }: { where: { userId_organizationId: { userId: string; organizationId: string } } }) =>
      state.memberships.find(
        (row) =>
          row.userId === where.userId_organizationId.userId &&
          row.organizationId === where.userId_organizationId.organizationId
      ) ?? null,
    create: async ({ data }: { data: Omit<MembershipRow, "id" | "reviewedAt" | "reviewedById"> }) => {
      const created: MembershipRow = {
        id: `membership-${state.memberships.length + 1}`,
        reviewedAt: null,
        reviewedById: null,
        ...data
      };
      state.memberships.push(created);
      return { status: created.status };
    },
    update: async ({ where, data }: { where: { id: string }; data: Partial<MembershipRow> }) => {
      const row = state.memberships.find((candidate) => candidate.id === where.id)!;
      Object.assign(row, data);
      return { status: row.status };
    }
  };
  const db = {
    organization: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        state.organizations.find((organization) => organization.id === where.id) ?? null,
      findFirst: async ({ where }: { where: { accessCodeHash: string; accessCodeEnabled: boolean } }) =>
        state.organizations.find(
          (organization) =>
            organization.accessCodeHash === where.accessCodeHash &&
            organization.accessCodeEnabled === where.accessCodeEnabled
        ) ?? null
    },
    membership,
    $transaction: async (callback: (client: { membership: typeof membership }) => unknown) => callback({ membership })
  };

  return { prisma: db };
});

const { joinOrganizationByPolicy, joinOrganizationWithAccessCode } = await import(
  "@/lib/organization-join-actions"
);

function organization(overrides: Partial<OrganizationRow> = {}): OrganizationRow {
  return {
    id: "org-1",
    slug: "example-club",
    name: "Example Club",
    joinPolicy: OrganizationJoinPolicy.OPEN,
    allowedEmailDomains: [],
    accessCodeHash: null,
    accessCodeEnabled: false,
    ...overrides
  };
}

function policyForm(organizationId = "org-1") {
  const formData = new FormData();
  formData.set("organizationId", organizationId);
  return formData;
}

function codeForm(code: string) {
  const formData = new FormData();
  formData.set("accessCode", code);
  return formData;
}

beforeEach(() => {
  process.env.ORGANIZATION_ACCESS_CODE_SECRET = "organization-code-test-secret";
  state.user.email = "player@example.com";
  state.user.emailVerifiedAt = new Date("2026-01-01");
  state.organizations = [];
  state.memberships = [];
  state.rateLimited = false;
});

describe("organization join actions", () => {
  it("creates active and pending memberships according to independent organization policies", async () => {
    state.organizations = [
      organization(),
      organization({ id: "org-2", name: "Approval Club", joinPolicy: OrganizationJoinPolicy.ADMIN_APPROVAL })
    ];

    await expect(joinOrganizationByPolicy({}, policyForm("org-1"))).resolves.toMatchObject({ outcome: "active" });
    await expect(joinOrganizationByPolicy({}, policyForm("org-2"))).resolves.toMatchObject({ outcome: "pending" });
    expect(state.memberships).toMatchObject([
      { organizationId: "org-1", status: MembershipStatus.ACTIVE, joinMethod: MembershipJoinMethod.OPEN_JOIN },
      { organizationId: "org-2", status: MembershipStatus.PENDING, joinMethod: MembershipJoinMethod.ADMIN_REQUEST }
    ]);
  });

  it("activates an exact email-domain match and rejects a substring match", async () => {
    state.organizations = [
      organization({ joinPolicy: OrganizationJoinPolicy.EMAIL_DOMAIN, allowedEmailDomains: ["example.com"] })
    ];

    state.user.email = "player@evil-example.com";
    await expect(joinOrganizationByPolicy({}, policyForm())).resolves.toMatchObject({ outcome: "domain_not_allowed" });
    expect(state.memberships).toHaveLength(0);

    state.user.email = "player@example.com";
    await expect(joinOrganizationByPolicy({}, policyForm())).resolves.toMatchObject({ outcome: "active" });
  });

  it("activates an existing pending Polisen membership with the current code", async () => {
    const code = "2345-6789-ABCD";
    state.organizations = [
      organization({
        id: "org-polisen",
        slug: "polisen",
        name: "Polisen",
        joinPolicy: OrganizationJoinPolicy.ACCESS_CODE,
        accessCodeHash: hashOrganizationAccessCode(code),
        accessCodeEnabled: true
      })
    ];
    state.memberships = [
      {
        id: "membership-1",
        userId: state.user.id,
        organizationId: "org-polisen",
        status: MembershipStatus.PENDING,
        joinMethod: MembershipJoinMethod.ADMIN_REQUEST,
        activatedAt: null,
        reviewedAt: null,
        reviewedById: null
      }
    ];

    await expect(joinOrganizationWithAccessCode({}, codeForm(code))).resolves.toMatchObject({
      outcome: "active",
      organizationSlug: "polisen"
    });
    expect(state.memberships[0]).toMatchObject({
      status: MembershipStatus.ACTIVE,
      joinMethod: MembershipJoinMethod.ACCESS_CODE,
      activatedAt: expect.any(Date)
    });
  });

  it("rejects invalid, disabled, and rotated codes with the same generic response", async () => {
    const oldCode = "2345-6789-ABCD";
    const currentCode = "EFGH-JKMN-PQRS";
    const target = organization({
      joinPolicy: OrganizationJoinPolicy.ACCESS_CODE,
      accessCodeHash: hashOrganizationAccessCode(currentCode),
      accessCodeEnabled: true
    });
    state.organizations = [target];

    await expect(joinOrganizationWithAccessCode({}, codeForm(oldCode))).resolves.toMatchObject({ outcome: "invalid_code" });
    target.accessCodeEnabled = false;
    await expect(joinOrganizationWithAccessCode({}, codeForm(currentCode))).resolves.toMatchObject({
      outcome: "invalid_code"
    });
    expect(state.memberships).toHaveLength(0);
  });

  it("does not let duplicate, rejected, or suspended memberships bypass their status", async () => {
    state.organizations = [organization()];
    state.memberships = [
      {
        id: "membership-1",
        userId: state.user.id,
        organizationId: "org-1",
        status: MembershipStatus.ACTIVE,
        joinMethod: MembershipJoinMethod.LEGACY,
        activatedAt: new Date(),
        reviewedAt: null,
        reviewedById: null
      }
    ];
    await expect(joinOrganizationByPolicy({}, policyForm())).resolves.toMatchObject({ outcome: "already_member" });

    state.memberships[0].status = MembershipStatus.REJECTED;
    await expect(joinOrganizationByPolicy({}, policyForm())).resolves.toMatchObject({ outcome: "rejected" });
    state.memberships[0].status = MembershipStatus.SUSPENDED;
    await expect(joinOrganizationByPolicy({}, policyForm())).resolves.toMatchObject({ outcome: "suspended" });
    expect(state.memberships).toHaveLength(1);
  });

  it("throttles code attempts before membership creation", async () => {
    state.rateLimited = true;

    await expect(joinOrganizationWithAccessCode({}, codeForm("2345-6789-ABCD"))).resolves.toMatchObject({
      outcome: "rate_limited"
    });
    expect(state.memberships).toHaveLength(0);
  });
});
