import { MembershipStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const sessionUser = await getSessionUser();

  if (!sessionUser?.user.emailVerifiedAt) {
    return NextResponse.json({ organizations: [] }, { status: 401 });
  }

  const memberships = await prisma.membership.findMany({
    where: { userId: sessionUser.user.id, status: MembershipStatus.ACTIVE },
    select: {
      role: true,
      organization: { select: { slug: true, name: true } }
    },
    orderBy: { organization: { name: "asc" } }
  });

  return NextResponse.json({
    organizations: memberships.map((membership) => ({
      slug: membership.organization.slug,
      name: membership.organization.name,
      role: membership.role
    }))
  });
}
