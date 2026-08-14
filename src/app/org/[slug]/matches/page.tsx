import OrganizationMatchesPage from "@/features/organization-pages/MatchesPage";

export const dynamic = "force-dynamic";

export default function MatchesPage({
  params,
  searchParams
}: {
  params: { slug: string };
  searchParams?: { challengeId?: string };
}) {
  return <OrganizationMatchesPage organizationSlug={params.slug} searchParams={searchParams} />;
}
