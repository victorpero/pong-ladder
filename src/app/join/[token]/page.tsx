import { Building2, Clock3, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { InvitationRedemption } from "@/components/InvitationRedemption";
import { LogoMark } from "@/components/LogoMark";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/authz";
import {
  hasActiveOrganizationMembership,
  inspectOrganizationInvitation,
  isOrganizationInvitationToken
} from "@/lib/organization-invitation";
import { organizationsPath } from "@/lib/organization-paths";

export const dynamic = "force-dynamic";

export default async function OrganizationInvitationPage({ params }: { params: { token: string } }) {
  const token = params.token;
  const continuePath = isOrganizationInvitationToken(token) ? `/join/${token}/continue` : "/join/invalid";
  const invitation = await inspectOrganizationInvitation(token);

  if (invitation.availability === "invalid") {
    return <InvitationUnavailable title="Invitation unavailable" body="This invitation link is invalid." />;
  }

  const sessionUser = await getSessionUser();

  if (invitation.availability !== "valid") {
    // An invitation that ran out or lapsed after it was accepted is not a failure for
    // the member it already admitted, so finish on the organization instead.
    if (sessionUser && (await hasActiveOrganizationMembership(sessionUser.user.id, invitation.organization.id))) {
      redirect(`${organizationsPath}?joined=${encodeURIComponent(invitation.organization.slug)}`);
    }

    return (
      <InvitationUnavailable
        title={`Invitation ${invitation.availability}`}
        body={`This invitation to ${invitation.organization.name} can no longer be used.`}
      />
    );
  }

  if (!sessionUser) {
    return (
      <InvitationShell organizationName={invitation.organization.name} expiresAt={invitation.expiresAt}>
        <p className="mt-5 text-sm leading-6 text-muted">
          Log in or create an account to accept this invitation. The link remains active through authentication.
        </p>
        <a className="button mt-6 inline-flex" href={continuePath}>
          Continue to login
        </a>
      </InvitationShell>
    );
  }

  if (!sessionUser.user.emailVerifiedAt) {
    return (
      <InvitationShell organizationName={invitation.organization.name} expiresAt={invitation.expiresAt}>
        <p className="mt-5 text-sm leading-6 text-muted">
          Verify {sessionUser.user.email} before accepting this invitation.
        </p>
        <a className="button mt-6 inline-flex" href={continuePath}>
          Verify email
        </a>
      </InvitationShell>
    );
  }

  return (
    <InvitationShell organizationName={invitation.organization.name} expiresAt={invitation.expiresAt}>
      <InvitationRedemption token={token} organizationName={invitation.organization.name} />
    </InvitationShell>
  );
}

function InvitationShell({
  organizationName,
  expiresAt,
  children
}: {
  organizationName: string;
  expiresAt?: Date;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-lg items-center justify-center">
        <section className="section-band w-full text-center">
          <div className="mb-5 flex justify-center">
            <LogoMark />
          </div>
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-court-50 text-court-700">
            <Building2 aria-hidden="true" size={24} />
          </span>
          <p className="label mt-5">Organization invitation</p>
          <h1 className="mt-2 text-3xl font-black">Join {organizationName}</h1>
          <p className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-muted">
            <ShieldCheck aria-hidden="true" size={17} /> Verified accounts receive active membership
          </p>
          {expiresAt ? (
            <p className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-muted">
              <Clock3 aria-hidden="true" size={15} /> Expires {expiresAt.toLocaleString()}
            </p>
          ) : null}
          {children}
        </section>
      </div>
    </main>
  );
}

function InvitationUnavailable({ title, body }: { title: string; body: string }) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-lg items-center justify-center">
        <section className="section-band w-full text-center">
          <div className="mb-5 flex justify-center">
            <LogoMark />
          </div>
          <p className="label">Organization invitation</p>
          <h1 className="mt-2 text-3xl font-black capitalize">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-muted">{body}</p>
          <Link className="button-secondary mt-6 inline-flex" href={organizationsPath}>
            Back to organizations
          </Link>
        </section>
      </div>
    </main>
  );
}
