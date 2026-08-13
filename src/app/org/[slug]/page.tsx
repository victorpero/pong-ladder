import { redirect } from "next/navigation";
import { organizationPath } from "@/lib/organization-paths";

export default function OrganizationPage({ params }: { params: { slug: string } }) {
  redirect(organizationPath(params.slug));
}
