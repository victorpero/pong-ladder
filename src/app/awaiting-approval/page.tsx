import { redirect } from "next/navigation";
import { logout } from "@/lib/auth-actions";
import { getSessionUser } from "@/lib/authz";
import { getDefaultOrganization } from "@/lib/organizations";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AwaitingApprovalPage() {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    redirect("/login?next=/awaiting-approval");
  }

  const organization = await getDefaultOrganization(prisma);
  const membership = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId: sessionUser.user.id, organizationId: organization.id } },
    select: { status: true }
  });

  if (membership?.status === "ACTIVE") {
    redirect("/ladder");
  }

  return (
    <main className="page-shell flex min-h-screen items-center justify-center">
      <section className="section-band w-full max-w-lg text-center">
        <p className="label">Account pending</p>
        <h1 className="mt-2 text-3xl font-black">Your account is awaiting admin approval.</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          You will get access to the ladder, matches, challenges, and players once an admin approves your account.
        </p>
        <form action={logout} className="mt-6">
          <button className="button-secondary" type="submit">
            Log out
          </button>
        </form>
      </section>
    </main>
  );
}
