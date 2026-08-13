import OrganizationAccountPage from "@/features/organization-pages/AccountPage";

export const dynamic = "force-dynamic";

export default function AccountPage({ params }: { params: { slug: string } }) {
  return <OrganizationAccountPage organizationSlug={params.slug} />;
}
