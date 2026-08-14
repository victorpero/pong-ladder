import OrganizationAdminPage from "@/features/organization-pages/AdminPage";

export const dynamic = "force-dynamic";

export default function AdminPage({ params }: { params: { slug: string } }) {
  return <OrganizationAdminPage organizationSlug={params.slug} />;
}
