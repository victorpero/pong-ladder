import type { Metadata } from "next";
import { Building2, Clock3, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { InvitationRedemption } from "@/components/InvitationRedemption";
import { LogoMark } from "@/components/LogoMark";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/authz";
import { formatDateTime } from "@/lib/format";
import { toSupportedLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";
import { t } from "@/lib/i18n/format";
import {
  hasActiveOrganizationMembership,
  inspectOrganizationInvitation,
  isOrganizationInvitationToken
} from "@/lib/organization-invitation";
import { appPath, organizationsPath } from "@/lib/organization-paths";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  return { title: getDictionary(params.locale).metadata.invitationTitle };
}

export default async function OrganizationInvitationPage({
  params
}: {
  params: { locale: string; token: string };
}) {
  const locale = toSupportedLocale(params.locale);
  const dictionary = getDictionary(locale);
  const token = params.token;
  const continuePath = appPath(
    locale,
    isOrganizationInvitationToken(token) ? `/join/${token}/continue` : "/join/invalid"
  );
  const invitation = await inspectOrganizationInvitation(token);

  if (invitation.availability === "invalid") {
    return (
      <InvitationUnavailable
        locale={locale}
        title={dictionary.invitation.unavailableTitle}
        body={dictionary.invitation.invalidBody}
      />
    );
  }

  const sessionUser = await getSessionUser();

  if (invitation.availability !== "valid") {
    // An invitation that ran out or lapsed after it was accepted is not a failure for
    // the member it already admitted, so finish on the organization instead.
    if (sessionUser && (await hasActiveOrganizationMembership(sessionUser.user.id, invitation.organization.id))) {
      redirect(`${organizationsPath(locale)}?joined=${encodeURIComponent(invitation.organization.slug)}`);
    }

    return (
      <InvitationUnavailable
        locale={locale}
        title={dictionary.invitation.stateTitle[invitation.availability]}
        body={t(dictionary.invitation.unusableBody, { organization: invitation.organization.name })}
      />
    );
  }

  if (!sessionUser) {
    return (
      <InvitationShell
        locale={locale}
        organizationName={invitation.organization.name}
        expiresAt={invitation.expiresAt}
      >
        <p className="mt-5 text-sm leading-6 text-muted">{dictionary.invitation.loginPrompt}</p>
        <a className="button mt-6 inline-flex" href={continuePath}>
          {dictionary.invitation.continueToLogin}
        </a>
      </InvitationShell>
    );
  }

  if (!sessionUser.user.emailVerifiedAt) {
    return (
      <InvitationShell
        locale={locale}
        organizationName={invitation.organization.name}
        expiresAt={invitation.expiresAt}
      >
        <p className="mt-5 text-sm leading-6 text-muted">
          {t(dictionary.invitation.verifyPrompt, { email: sessionUser.user.email })}
        </p>
        <a className="button mt-6 inline-flex" href={continuePath}>
          {dictionary.invitation.verifyEmail}
        </a>
      </InvitationShell>
    );
  }

  return (
    <InvitationShell
      locale={locale}
      organizationName={invitation.organization.name}
      expiresAt={invitation.expiresAt}
    >
      <InvitationRedemption token={token} organizationName={invitation.organization.name} />
    </InvitationShell>
  );
}

function InvitationShell({
  locale,
  organizationName,
  expiresAt,
  children
}: {
  locale: Locale;
  organizationName: string;
  expiresAt?: Date;
  children: React.ReactNode;
}) {
  const dictionary = getDictionary(locale);

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
          <p className="label mt-5">{dictionary.invitation.label}</p>
          <h1 className="mt-2 text-3xl font-black">
            {t(dictionary.invitation.joinHeading, { organization: organizationName })}
          </h1>
          <p className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-muted">
            <ShieldCheck aria-hidden="true" size={17} /> {dictionary.invitation.verifiedNote}
          </p>
          {expiresAt ? (
            <p className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-muted">
              <Clock3 aria-hidden="true" size={15} />{" "}
              {t(dictionary.invitation.expires, { date: formatDateTime(expiresAt, locale) })}
            </p>
          ) : null}
          {children}
        </section>
      </div>
    </main>
  );
}

function InvitationUnavailable({ locale, title, body }: { locale: Locale; title: string; body: string }) {
  const dictionary = getDictionary(locale);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-lg items-center justify-center">
        <section className="section-band w-full text-center">
          <div className="mb-5 flex justify-center">
            <LogoMark />
          </div>
          <p className="label">{dictionary.invitation.label}</p>
          <h1 className="mt-2 text-3xl font-black">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-muted">{body}</p>
          <Link className="button-secondary mt-6 inline-flex" href={organizationsPath(locale)}>
            {dictionary.common.backToOrganizations}
          </Link>
        </section>
      </div>
    </main>
  );
}
