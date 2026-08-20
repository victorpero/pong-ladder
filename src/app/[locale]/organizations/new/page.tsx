import type { Metadata } from "next";
import Link from "next/link";
import { CreateOrganizationForm } from "@/components/CreateOrganizationForm";
import { LogoMark } from "@/components/LogoMark";
import { requireAuthenticatedUser, verifyEmailPath } from "@/lib/authz";
import { toSupportedLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";
import { canCreateOrganizations } from "@/lib/organization-creation-policy";
import { newOrganizationPath, organizationsPath } from "@/lib/organization-paths";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  return { title: getDictionary(params.locale).metadata.newOrganizationTitle };
}

export default async function NewOrganizationPage({ params }: { params: { locale: string } }) {
  const locale = toSupportedLocale(params.locale);
  const dictionary = getDictionary(locale);
  const createPath = newOrganizationPath(locale);
  const { user } = await requireAuthenticatedUser(createPath);

  if (!user.emailVerifiedAt) {
    redirect(`${verifyEmailPath(locale)}?next=${encodeURIComponent(createPath)}`);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <LogoMark />
            <span className="text-lg font-black">Pong Ladder</span>
          </div>
          <Link className="button-secondary" href={organizationsPath(locale)}>
            {dictionary.common.back}
          </Link>
        </header>
        <section className="section-band">
          <p className="label">{dictionary.createOrganization.label}</p>
          <h1 className="mt-2 text-3xl font-black">{dictionary.createOrganization.heading}</h1>
          <p className="mt-3 text-sm leading-6 text-muted">{dictionary.createOrganization.intro}</p>
          {canCreateOrganizations(user.email) ? (
            <div className="mt-6">
              <CreateOrganizationForm />
            </div>
          ) : (
            <div className="mt-6 rounded-lg bg-slate-100 p-4">
              <p className="font-black">{dictionary.createOrganization.disabledTitle}</p>
              <p className="mt-1 text-sm leading-6 text-muted">{dictionary.createOrganization.disabledBody}</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
