import Link from "next/link";
import { CreateOrganizationForm } from "@/components/CreateOrganizationForm";
import { LogoMark } from "@/components/LogoMark";
import { requireAuthenticatedUser, verifyEmailPath } from "@/lib/authz";
import { canCreateOrganizations } from "@/lib/organization-creation-policy";
import { organizationsPath } from "@/lib/organization-paths";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function NewOrganizationPage() {
  const { user } = await requireAuthenticatedUser("/organizations/new");

  if (!user.emailVerifiedAt) {
    redirect(`${verifyEmailPath}?next=${encodeURIComponent("/organizations/new")}`);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <LogoMark />
            <span className="text-lg font-black">Pong Ladder</span>
          </div>
          <Link className="button-secondary" href={organizationsPath}>
            Back
          </Link>
        </header>
        <section className="section-band">
          <p className="label">New tenant</p>
          <h1 className="mt-2 text-3xl font-black">Create an organization</h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            The creator becomes the active owner. Organization membership and data remain isolated from every other tenant.
          </p>
          {canCreateOrganizations(user.email) ? (
            <div className="mt-6">
              <CreateOrganizationForm />
            </div>
          ) : (
            <div className="mt-6 rounded-lg bg-slate-100 p-4">
              <p className="font-black">Creation is not enabled for this account</p>
              <p className="mt-1 text-sm leading-6 text-muted">
                Organization creation is currently limited by feature flag or creator allowlist.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
