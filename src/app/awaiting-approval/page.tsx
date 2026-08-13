import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/authz";
import { organizationsPath } from "@/lib/organization-paths";

export const dynamic = "force-dynamic";

export default async function AwaitingApprovalPage() {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    redirect("/login?next=/awaiting-approval");
  }

  if (!sessionUser.user.emailVerifiedAt) {
    redirect("/verify-email?next=/awaiting-approval");
  }

  redirect(organizationsPath);
}
