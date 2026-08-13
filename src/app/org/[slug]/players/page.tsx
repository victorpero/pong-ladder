import OrganizationPlayersPage from "@/features/organization-pages/PlayersPage";

export const dynamic = "force-dynamic";

export default function PlayersPage({ params }: { params: { slug: string } }) {
  return <OrganizationPlayersPage organizationSlug={params.slug} />;
}
