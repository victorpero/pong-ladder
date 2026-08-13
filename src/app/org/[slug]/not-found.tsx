import Link from "next/link";
import { organizationsPath } from "@/lib/organization-paths";

export default function OrganizationNotFound() {
  return (
    <main className="page-shell">
      <section className="section-band mx-auto max-w-xl text-center">
        <p className="label">Organization unavailable</p>
        <h1 className="mt-2 text-3xl font-black">This organization cannot be opened</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          The address may be incorrect, or your account may not have active access.
        </p>
        <Link className="button mt-5" href={organizationsPath}>
          Back to organizations
        </Link>
      </section>
    </main>
  );
}
