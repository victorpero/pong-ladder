import OrganizationTeamsPage from "@/features/organization-pages/TeamsPage";

export const dynamic = "force-dynamic";

export default function TeamsPage({ params }: { params: { slug: string } }) {
  return <OrganizationTeamsPage organizationSlug={params.slug} />;
}
