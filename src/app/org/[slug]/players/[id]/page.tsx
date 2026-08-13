import OrganizationPlayerPage from "@/features/organization-pages/PlayerPage";

export const dynamic = "force-dynamic";

export default function PlayerPage({ params }: { params: { slug: string; id: string } }) {
  return <OrganizationPlayerPage organizationSlug={params.slug} playerId={params.id} />;
}
