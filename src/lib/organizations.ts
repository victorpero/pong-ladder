import type { Prisma } from "@prisma/client";

export const DEFAULT_ORGANIZATION_ID = "org_polisen";
export const DEFAULT_ORGANIZATION_SLUG = "polisen";

type OrganizationClient = Pick<Prisma.TransactionClient, "organization">;

export async function getDefaultOrganization(client: OrganizationClient) {
  const organization = await client.organization.findUnique({
    where: { slug: DEFAULT_ORGANIZATION_SLUG }
  });

  if (!organization) {
    throw new Error("The default organization has not been configured.");
  }

  return organization;
}
