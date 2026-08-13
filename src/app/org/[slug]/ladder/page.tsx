import OrganizationLadderPage from "@/features/organization-pages/LadderPage";

export const dynamic = "force-dynamic";

export default function LadderPage({ params }: { params: { slug: string } }) {
  return <OrganizationLadderPage organizationSlug={params.slug} />;
}
