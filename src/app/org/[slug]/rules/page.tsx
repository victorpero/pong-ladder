import OrganizationRulesPage from "@/features/organization-pages/RulesPage";

export const dynamic = "force-dynamic";

export default function RulesPage({ params }: { params: { slug: string } }) {
  return <OrganizationRulesPage organizationSlug={params.slug} />;
}
