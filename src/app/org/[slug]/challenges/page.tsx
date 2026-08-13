import OrganizationChallengesPage from "@/features/organization-pages/ChallengesPage";

export const dynamic = "force-dynamic";

export default function ChallengesPage({ params }: { params: { slug: string } }) {
  return <OrganizationChallengesPage organizationSlug={params.slug} />;
}
