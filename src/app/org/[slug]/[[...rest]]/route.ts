import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/authz";
import { LOCALE_COOKIE_NAME, resolveLocale } from "@/lib/i18n/config";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Sends legacy organization addresses from PL-15, such as /org/polisen/ladder, to their
 * locale-prefixed equivalent. The redirect happens here rather than in middleware because the
 * organization default language needs a database lookup.
 */
export async function GET(request: NextRequest, { params }: { params: { slug: string; rest?: string[] } }) {
  const [sessionUser, organization] = await Promise.all([
    getSessionUser(),
    prisma.organization.findUnique({
      where: { slug: params.slug },
      select: { defaultLocale: true }
    })
  ]);
  const userPreference = sessionUser
    ? await prisma.user.findUnique({ where: { id: sessionUser.user.id }, select: { locale: true } })
    : null;
  const locale = resolveLocale({
    userPreference: userPreference?.locale,
    guestPreference: request.cookies.get(LOCALE_COOKIE_NAME)?.value,
    organizationDefault: organization?.defaultLocale,
    acceptLanguage: request.headers.get("accept-language")
  });

  const target = request.nextUrl.clone();
  const suffix = (params.rest ?? []).map((segment) => encodeURIComponent(segment)).join("/");
  target.pathname = `/${locale}/org/${encodeURIComponent(params.slug)}${suffix ? `/${suffix}` : ""}`;

  return NextResponse.redirect(target);
}
