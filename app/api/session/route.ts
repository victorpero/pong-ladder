import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";

export async function GET() {
  const session = await verifySessionToken(cookies().get(SESSION_COOKIE_NAME)?.value);

  if (!session) {
    return NextResponse.json({ isAdmin: false }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { isAdmin: true }
  });

  return NextResponse.json({ isAdmin: Boolean(user?.isAdmin) });
}
