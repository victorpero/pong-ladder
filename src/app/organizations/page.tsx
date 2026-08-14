import { MembershipStatus } from "@prisma/client";
import { Ban, Building2, CheckCircle2, Clock3, KeyRound, LogOut, ShieldCheck, UserCircle } from "lucide-react";
import Link from "next/link";
import { LogoMark } from "@/components/LogoMark";
import { OrganizationAccessCodeForm, OrganizationPolicyJoinForm } from "@/components/OrganizationJoinForms";
import { logout } from "@/lib/auth-actions";
import { requireAuthenticatedUser, verifyEmailPath } from "@/lib/authz";
import {
  canDisplayPendingOrganization,
  canDisplayUnavailableOrganization,
  discoverableOrganizationJoinPolicies
} from "@/lib/organization-discovery";
import { organizationPath, organizationsPath } from "@/lib/organization-paths";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function OrganizationsPage({
  searchParams
}: {
  searchParams: { joined?: string | string[] };
}) {
  const { user } = await requireAuthenticatedUser(organizationsPath);

  if (!user.emailVerifiedAt) {
    redirect(`${verifyEmailPath}?next=${encodeURIComponent(organizationsPath)}`);
  }

  const memberships = await prisma.membership.findMany({
    where: {
      userId: user.id
    },
    include: { organization: true },
    orderBy: [{ organization: { name: "asc" } }]
  });
  const activeMemberships = memberships.filter((membership) => membership.status === MembershipStatus.ACTIVE);
  const joinedSlug = Array.isArray(searchParams.joined) ? searchParams.joined[0] : searchParams.joined;
  const joinedMembership = activeMemberships.find((membership) => membership.organization.slug === joinedSlug);
  const pendingMemberships = memberships.filter(
    (membership) =>
      membership.status === MembershipStatus.PENDING &&
      canDisplayPendingOrganization(membership.organization.joinPolicy)
  );
  const blockedMemberships = memberships.filter(
    (membership) =>
      (membership.status === MembershipStatus.REJECTED || membership.status === MembershipStatus.SUSPENDED) &&
      canDisplayUnavailableOrganization({
        status: membership.status,
        activatedAt: membership.activatedAt,
        joinPolicy: membership.organization.joinPolicy
      })
  );
  const membershipOrganizationIds = new Set(memberships.map((membership) => membership.organizationId));
  const availableOrganizations = await prisma.organization.findMany({
    where: {
      id: { notIn: [...membershipOrganizationIds] },
      joinPolicy: {
        in: discoverableOrganizationJoinPolicies
      }
    },
    select: { id: true, name: true, type: true, joinPolicy: true },
    orderBy: { name: "asc" }
  });

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <LogoMark />
            <span className="text-lg font-black">Pong Ladder</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-sm font-semibold text-muted sm:block">{user.username}</span>
            {activeMemberships[0] ? (
              <Link
                href={organizationPath(activeMemberships[0].organization.slug, "account")}
                aria-label="My account"
                title="My account"
                className="grid h-10 w-10 place-items-center rounded-md border border-line bg-white text-ink transition hover:border-court-500 hover:text-court-700"
              >
                <UserCircle aria-hidden="true" size={19} strokeWidth={2.2} />
              </Link>
            ) : null}
            <form action={logout}>
              <button
                type="submit"
                aria-label="Log out"
                title="Log out"
                className="grid h-10 w-10 place-items-center rounded-md border border-line bg-white text-neutral transition hover:border-court-200 hover:text-court-700"
              >
                <LogOut aria-hidden="true" size={18} strokeWidth={2.2} />
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="page-shell">
        <section className="mb-7 max-w-3xl">
          <p className="label">Organizations</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Where are you playing?</h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            Choose an organization to open its ladder. Your matches, teams, challenges, and rankings stay inside that
            organization.
          </p>
        </section>

        {joinedMembership ? (
          <section className="mb-8 flex max-w-3xl items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-5">
            <CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0 text-success" size={22} />
            <div>
              <p className="font-black text-success">Invitation accepted</p>
              <p className="mt-1 text-sm leading-6 text-muted">
                {joinedMembership.organization.name} is now one of your organizations. Open its ladder below.
              </p>
            </div>
          </section>
        ) : null}

        <section className="section-band mb-8 max-w-3xl">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-court-50 text-court-700">
              <KeyRound aria-hidden="true" size={20} />
            </span>
            <div>
              <h2 className="text-xl font-black">Join with an organization code</h2>
              <p className="mt-1 text-sm leading-6 text-muted">
                Enter the code shared by your organization. Valid codes add your verified account immediately.
              </p>
            </div>
          </div>
          <div className="mt-5">
            <OrganizationAccessCodeForm />
          </div>
        </section>

        {activeMemberships.length > 0 ? (
          <section aria-labelledby="active-organizations-heading">
            <h2 id="active-organizations-heading" className="sr-only">
              Your organizations
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {activeMemberships.map((membership) => (
                <Link
                  key={membership.id}
                  href={organizationPath(membership.organization.slug)}
                  className="group rounded-xl border border-line bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-court-500 hover:shadow-soft"
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="grid h-11 w-11 place-items-center rounded-lg bg-court-50 text-court-700">
                      <Building2 aria-hidden="true" size={22} strokeWidth={2.2} />
                    </span>
                    <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-black text-success">Active</span>
                  </div>
                  <h2 className="mt-5 text-xl font-black group-hover:text-court-700">{membership.organization.name}</h2>
                  <p className="mt-1 text-sm font-semibold capitalize text-muted">
                    {membership.organization.type.toLowerCase().replaceAll("_", " ")}
                  </p>
                  <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted">
                      <ShieldCheck aria-hidden="true" size={15} />
                      {membership.role.toLowerCase()}
                    </span>
                    <span className="text-sm font-black text-court-700">Open ladder →</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : (
          <section className="section-band max-w-2xl">
            <Building2 className="text-court-700" aria-hidden="true" size={28} />
            <h2 className="mt-4 text-xl font-black">You have no active organizations</h2>
            <p className="mt-2 text-sm leading-6 text-muted">Use an invitation, organization code, or join option below.</p>
          </section>
        )}

        {pendingMemberships.length > 0 ? (
          <section className="mt-8" aria-labelledby="pending-organizations-heading">
            <div className="mb-3 flex items-center gap-2">
              <Clock3 aria-hidden="true" className="text-muted" size={18} />
              <h2 id="pending-organizations-heading" className="text-lg font-black">
                Pending access
              </h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {pendingMemberships.map((membership) => (
                <article key={membership.id} className="rounded-lg border border-line bg-white p-4">
                  <p className="font-black">{membership.organization.name}</p>
                  <p className="mt-1 text-sm font-semibold text-muted">
                    {getPendingMembershipMessage(membership.organization.joinPolicy)}
                  </p>
                  {membership.organization.joinPolicy === "OPEN" ||
                  membership.organization.joinPolicy === "EMAIL_DOMAIN" ? (
                    <OrganizationPolicyJoinForm
                      organizationId={membership.organization.id}
                      label={membership.organization.joinPolicy === "OPEN" ? "Activate access" : "Verify domain"}
                    />
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {blockedMemberships.length > 0 ? (
          <section className="mt-8" aria-labelledby="unavailable-organizations-heading">
            <div className="mb-3 flex items-center gap-2">
              <Ban aria-hidden="true" className="text-muted" size={18} />
              <h2 id="unavailable-organizations-heading" className="text-lg font-black">
                Unavailable access
              </h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {blockedMemberships.map((membership) => (
                <article key={membership.id} className="rounded-lg border border-line bg-white p-4">
                  <p className="font-black">{membership.organization.name}</p>
                  <p className="mt-1 text-sm font-semibold text-muted">
                    {membership.status === MembershipStatus.SUSPENDED ? "Access suspended" : "Join request rejected"}
                  </p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {availableOrganizations.length > 0 ? (
          <section className="mt-8" aria-labelledby="available-organizations-heading">
            <div className="mb-3">
              <p className="label">Discover</p>
              <h2 id="available-organizations-heading" className="mt-1 text-2xl font-black">
                Available organizations
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {availableOrganizations.map((organization) => {
                const joinOption = getJoinOption(organization.joinPolicy);

                return (
                  <article key={organization.id} className="rounded-xl border border-line bg-white p-5">
                    <Building2 aria-hidden="true" className="text-court-700" size={24} />
                    <h3 className="mt-4 text-lg font-black">{organization.name}</h3>
                    <p className="mt-1 text-sm font-semibold capitalize text-muted">
                      {organization.type.toLowerCase().replaceAll("_", " ")}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-muted">{joinOption.description}</p>
                    {joinOption.buttonLabel ? (
                      <OrganizationPolicyJoinForm
                        organizationId={organization.id}
                        label={joinOption.buttonLabel}
                      />
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function getJoinOption(policy: string) {
  switch (policy) {
    case "OPEN":
      return { description: "Open to any player with a verified email.", buttonLabel: "Join now" };
    case "ADMIN_APPROVAL":
      return { description: "An administrator reviews new membership requests.", buttonLabel: "Request access" };
    case "EMAIL_DOMAIN":
      return { description: "Your verified email must match an allowed organization domain.", buttonLabel: "Verify domain" };
    default:
      return { description: "Joining is not currently available.", buttonLabel: null };
  }
}

function getPendingMembershipMessage(policy: string) {
  switch (policy) {
    case "OPEN":
      return "This organization is now open; activate your access below";
    case "EMAIL_DOMAIN":
      return "Verify your email domain again to activate access";
    default:
      return "Waiting for organization approval";
  }
}
