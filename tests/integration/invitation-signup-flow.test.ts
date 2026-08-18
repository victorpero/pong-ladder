import { MembershipAuditAction, MembershipStatus, PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Exercises the whole server-side invitation handoff against a real database:
// invitation -> unauthenticated visitor -> account -> email verification ->
// automatic redemption -> membership. Set RUN_DB_INTEGRATION_TESTS=1 and point
// DATABASE_URL at a migrated PostgreSQL database to run it.
const enabled = process.env.RUN_DB_INTEGRATION_TESTS === "1";

type SessionUser = { user: { id: string; email: string; emailVerifiedAt: Date | null } } | null;

const state = vi.hoisted(() => ({
  sessionUser: null as SessionUser,
  cookieJar: new Map<string, string>(),
  sentVerificationUrls: [] as string[]
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("next/headers", () => ({
  headers: () => new Headers(),
  cookies: () => ({
    get: (name: string) =>
      state.cookieJar.has(name) ? { name, value: state.cookieJar.get(name) } : undefined,
    set: (name: string, value: string, options?: { maxAge?: number }) => {
      if (options?.maxAge === 0 || value === "") {
        state.cookieJar.delete(name);
        return;
      }

      state.cookieJar.set(name, value);
    }
  })
}));

vi.mock("@/lib/authz", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/authz")>();

  return { ...actual, getSessionUser: vi.fn(() => Promise.resolve(state.sessionUser)) };
});

vi.mock("@/lib/email", () => ({
  sendVerificationEmail: ({ verificationUrl }: { verificationUrl: string }) => {
    state.sentVerificationUrls.push(verificationUrl);
    return Promise.resolve();
  }
}));

const { GET: continueInvitation } = await import("@/app/join/[token]/continue/route");
const { resumePendingInvitationAction } = await import("@/lib/organization-invitation-actions");
const { consumeEmailVerification, issueEmailVerification } = await import("@/lib/email-verification");
const {
  generateOrganizationInvitationToken,
  hashOrganizationInvitationToken,
  hasActiveOrganizationMembership,
  inspectOrganizationInvitation
} = await import("@/lib/organization-invitation");
const { PENDING_INVITATION_COOKIE, pendingInvitationCookie } = await import("@/lib/pending-invitation");

const prisma = new PrismaClient();
const organizationId = "org_invitation_flow";

describe.skipIf(!enabled)("organization invitation signup flow", () => {
  beforeAll(async () => {
    process.env.APP_BASE_URL = "http://localhost:3000";
    process.env.SESSION_SECRET ||= "integration-invitation-secret-0123456789";
    await cleanUp();
    await prisma.organization.create({
      data: { id: organizationId, slug: "invitation-flow", name: "Invitation Flow", type: "WORKPLACE" }
    });
  });

  afterAll(async () => {
    await cleanUp();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    state.sessionUser = null;
    state.cookieJar = new Map();
    state.sentVerificationUrls = [];
    await prisma.membershipAuditEvent.deleteMany({ where: { organizationId } });
    await prisma.invitationRedemption.deleteMany({ where: { organizationId } });
    await prisma.membership.deleteMany({ where: { organizationId } });
    await prisma.organizationInvitation.deleteMany({ where: { organizationId } });
    await prisma.emailVerificationToken.deleteMany({});
    await prisma.user.deleteMany({ where: { email: { endsWith: "@invitation-flow.test" } } });
  });

  it("joins a brand new account from a single invitation open", async () => {
    const { token, invitation } = await createInvitation();

    // 1. A signed-out visitor opens the invitation and is handed off to signup.
    const handoff = await continueInvitation(invitationRequest(token), { params: { token } });
    storeCookies(handoff);

    expect(handoff.headers.get("location")).toContain("/login");
    expect(state.cookieJar.get(PENDING_INVITATION_COOKIE)).toBeTruthy();
    expect(await useCount(invitation.id)).toBe(0);

    // 2. They create an account and a verification email goes out.
    const user = await createUnverifiedUser("newcomer");
    state.sessionUser = { user: { id: user.id, email: user.email, emailVerifiedAt: null } };
    await issueEmailVerification(user.id, user.email, "/organizations");

    // Redemption is refused while the account is unverified, and the handoff survives.
    expect(await resumePendingInvitationAction()).toEqual({ outcome: "verification_required" });
    expect(state.cookieJar.get(PENDING_INVITATION_COOKIE)).toBeTruthy();

    // 3. They verify their email.
    expect(await consumeEmailVerification(verificationToken())).toBe(true);
    state.sessionUser = { user: { id: user.id, email: user.email, emailVerifiedAt: new Date() } };

    // 4. The invitation is redeemed automatically, with no second open.
    expect(await resumePendingInvitationAction()).toMatchObject({
      outcome: "redeemed",
      organizationSlug: "invitation-flow"
    });

    const membership = await prisma.membership.findFirstOrThrow({ where: { userId: user.id, organizationId } });
    expect(membership.status).toBe(MembershipStatus.ACTIVE);
    expect(membership.joinMethod).toBe("INVITATION");
    expect(await useCount(invitation.id)).toBe(1);
    expect(await prisma.invitationRedemption.count({ where: { invitationId: invitation.id } })).toBe(1);
    expect(
      await prisma.membershipAuditEvent.count({
        where: { subjectUserId: user.id, action: MembershipAuditAction.MEMBER_ADDED }
      })
    ).toBe(1);
    expect(state.cookieJar.get(PENDING_INVITATION_COOKIE)).toBeUndefined();
  });

  it("keeps a replayed single-use invitation idempotent instead of reporting it exhausted", async () => {
    const { invitation } = await createInvitation({ maxUses: 1 });
    const user = await createVerifiedUser("replayer");
    state.sessionUser = { user: { id: user.id, email: user.email, emailVerifiedAt: new Date() } };

    armHandoff(invitation.id);
    expect(await resumePendingInvitationAction()).toMatchObject({ outcome: "redeemed" });

    // The invitation is now exhausted, but this account already holds the membership
    // it granted, so a repeated completion handler must still finish cleanly.
    armHandoff(invitation.id);
    expect(await resumePendingInvitationAction()).toMatchObject({
      outcome: "already_member",
      organizationSlug: "invitation-flow"
    });

    expect(await useCount(invitation.id)).toBe(1);
    expect(await prisma.membership.count({ where: { userId: user.id, organizationId } })).toBe(1);
    expect(await prisma.invitationRedemption.count({ where: { invitationId: invitation.id } })).toBe(1);
  });

  it("shows a member their organization when they reopen the invitation that admitted them", async () => {
    const { token, invitation } = await createInvitation({ maxUses: 1 });
    const user = await createVerifiedUser("returner");
    state.sessionUser = { user: { id: user.id, email: user.email, emailVerifiedAt: new Date() } };

    armHandoff(invitation.id);
    expect(await resumePendingInvitationAction()).toMatchObject({ outcome: "redeemed" });

    // The invitation page reads these two facts to decide between the organization and
    // an "exhausted" dead end, so the spent invitation must still name its organization.
    const reopened = await inspectOrganizationInvitation(token);
    expect(reopened).toMatchObject({
      availability: "exhausted",
      organization: { id: organizationId, slug: "invitation-flow" }
    });
    expect(await hasActiveOrganizationMembership(user.id, organizationId)).toBe(true);

    const stranger = await createVerifiedUser("stranger");
    expect(await hasActiveOrganizationMembership(stranger.id, organizationId)).toBe(false);
  });

  it("refuses a different account once the single use is spent", async () => {
    const { invitation } = await createInvitation({ maxUses: 1 });
    const first = await createVerifiedUser("first");
    const second = await createVerifiedUser("second");

    state.sessionUser = { user: { id: first.id, email: first.email, emailVerifiedAt: new Date() } };
    armHandoff(invitation.id);
    expect(await resumePendingInvitationAction()).toMatchObject({ outcome: "redeemed" });

    state.sessionUser = { user: { id: second.id, email: second.email, emailVerifiedAt: new Date() } };
    armHandoff(invitation.id);
    expect(await resumePendingInvitationAction()).toMatchObject({ outcome: "exhausted" });

    expect(await useCount(invitation.id)).toBe(1);
    expect(await prisma.membership.count({ where: { userId: second.id, organizationId } })).toBe(0);
  });

  it("reports an invitation that lapses while the account is being created", async () => {
    const { token, invitation } = await createInvitation();
    const handoff = await continueInvitation(invitationRequest(token), { params: { token } });
    storeCookies(handoff);

    const user = await createVerifiedUser("latecomer");
    state.sessionUser = { user: { id: user.id, email: user.email, emailVerifiedAt: new Date() } };
    await prisma.organizationInvitation.update({
      where: { id: invitation.id },
      data: { expiresAt: new Date(Date.now() - 1000) }
    });

    expect(await resumePendingInvitationAction()).toMatchObject({ outcome: "expired" });
    expect(await prisma.membership.count({ where: { userId: user.id, organizationId } })).toBe(0);
    expect(await useCount(invitation.id)).toBe(0);
    expect(state.cookieJar.get(PENDING_INVITATION_COOKIE)).toBeUndefined();
  });

  it("never hands off an invitation that is already unusable", async () => {
    const { token, invitation } = await createInvitation();
    await prisma.organizationInvitation.update({
      where: { id: invitation.id },
      data: { revokedAt: new Date() }
    });

    const handoff = await continueInvitation(invitationRequest(token), { params: { token } });
    storeCookies(handoff);

    expect(handoff.headers.get("location")).toContain(`/join/${token}`);
    expect(state.cookieJar.get(PENDING_INVITATION_COOKIE)).toBeUndefined();
  });
});

async function createInvitation({ maxUses = null }: { maxUses?: number | null } = {}) {
  const token = generateOrganizationInvitationToken();
  const invitation = await prisma.organizationInvitation.create({
    data: {
      organizationId,
      tokenHash: hashOrganizationInvitationToken(token),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      maxUses
    }
  });

  return { token, invitation };
}

async function createUnverifiedUser(name: string) {
  return prisma.user.create({
    data: {
      username: `${name}-${Date.now()}`,
      fullName: name,
      email: `${name}-${Date.now()}@invitation-flow.test`,
      emailVerified: false
    }
  });
}

async function createVerifiedUser(name: string) {
  const user = await createUnverifiedUser(name);

  return prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, emailVerifiedAt: new Date() }
  });
}

function invitationRequest(token: string) {
  return new Request(`http://localhost:3000/join/${token}/continue`);
}

function storeCookies(response: { cookies: { getAll: () => Array<{ name: string; value: string }> } }) {
  for (const cookie of response.cookies.getAll()) {
    if (cookie.value === "") {
      state.cookieJar.delete(cookie.name);
    } else {
      state.cookieJar.set(cookie.name, cookie.value);
    }
  }
}

function armHandoff(invitationId: string) {
  const cookie = pendingInvitationCookie(invitationId);
  state.cookieJar.set(cookie.name, cookie.value);
}

function verificationToken() {
  const [url] = state.sentVerificationUrls.slice(-1);
  return new URL(url).searchParams.get("token") ?? "";
}

function useCount(invitationId: string) {
  return prisma.organizationInvitation
    .findUniqueOrThrow({ where: { id: invitationId }, select: { useCount: true } })
    .then((row) => row.useCount);
}

async function cleanUp() {
  await prisma.membershipAuditEvent.deleteMany({ where: { organizationId } });
  await prisma.invitationRedemption.deleteMany({ where: { organizationId } });
  await prisma.membership.deleteMany({ where: { organizationId } });
  await prisma.organizationInvitation.deleteMany({ where: { organizationId } });
  await prisma.user.deleteMany({ where: { email: { endsWith: "@invitation-flow.test" } } });
  await prisma.organization.deleteMany({ where: { id: organizationId } });
}
