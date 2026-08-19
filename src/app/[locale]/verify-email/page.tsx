import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { VerificationControls } from "@/app/[locale]/verify-email/VerificationControls";
import { LogoMark } from "@/components/LogoMark";
import { logout } from "@/lib/auth-actions";
import { getSessionUser } from "@/lib/authz";
import { toSupportedLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";
import { loginPath, organizationsPath, postAuthenticationPath } from "@/lib/organization-paths";
import { PENDING_INVITATION_COOKIE, readPendingInvitation } from "@/lib/pending-invitation";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  return { title: getDictionary(params.locale).metadata.verifyEmailTitle };
}

function safeNextPath(locale: Locale, value?: string | string[]) {
  const path = Array.isArray(value) ? value[0] : value;
  const safePath = path?.startsWith("/") && !path.startsWith("//") ? path : null;
  return postAuthenticationPath(locale, safePath);
}

export default async function VerifyEmailPage({
  params,
  searchParams
}: {
  params: { locale: string };
  searchParams: {
    status?: string | string[];
    delivery?: string | string[];
    next?: string | string[];
  };
}) {
  const locale = toSupportedLocale(params.locale);
  const dictionary = getDictionary(locale);
  const sessionUser = await getSessionUser();
  const status = Array.isArray(searchParams.status) ? searchParams.status[0] : searchParams.status;
  const delivery = Array.isArray(searchParams.delivery) ? searchParams.delivery[0] : searchParams.delivery;
  const nextPath = safeNextPath(locale, searchParams.next);
  const verified = status === "verified" || Boolean(sessionUser?.user.emailVerifiedAt);

  // The account just became eligible, so resume the invitation it was created for
  // instead of waiting for another click. Cross-device verification has no handoff
  // cookie and keeps the Continue link below.
  if (
    sessionUser?.user.emailVerifiedAt &&
    readPendingInvitation(cookies().get(PENDING_INVITATION_COOKIE)?.value)
  ) {
    redirect(organizationsPath(locale));
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-lg items-center justify-center">
        <section className="section-band relative w-full text-center">
          <div className="mb-5 flex justify-center">
            <LogoMark />
          </div>
          <p className="label">{dictionary.verifyEmail.label}</p>
          {verified ? (
            <>
              <h1 className="mt-2 text-3xl font-black">{dictionary.verifyEmail.verifiedHeading}</h1>
              <p className="mt-3 text-sm leading-6 text-muted">{dictionary.verifyEmail.verifiedBody}</p>
              <Link className="button mt-6 inline-flex" href={nextPath}>
                {dictionary.verifyEmail.continue}
              </Link>
            </>
          ) : (
            <>
              <h1 className="mt-2 text-3xl font-black">{dictionary.verifyEmail.checkHeading}</h1>
              <p className="mt-3 text-sm leading-6 text-muted">{dictionary.verifyEmail.checkBody}</p>
              {status === "invalid" ? (
                <p className="mt-4 rounded-md bg-court-50 p-3 text-sm font-semibold text-court-700">
                  {dictionary.verifyEmail.invalidLink}
                </p>
              ) : null}
              {delivery === "failed" ? (
                <p className="mt-4 rounded-md bg-court-50 p-3 text-sm font-semibold text-court-700">
                  {dictionary.verifyEmail.deliveryFailed}
                </p>
              ) : null}
              {sessionUser ? (
                <>
                  <VerificationControls email={sessionUser.user.email} nextPath={nextPath} />
                  <form action={logout} className="absolute right-4 top-4 sm:right-5 sm:top-5">
                    <button
                      aria-label={dictionary.verifyEmail.backToMainScreen}
                      className="inline-flex items-center rounded-md border border-line bg-white px-2.5 py-1.5 text-xs font-bold text-muted transition hover:border-court-500 hover:text-court-700"
                      type="submit"
                    >
                      {dictionary.common.back}
                    </button>
                  </form>
                </>
              ) : (
                <Link className="button mt-6 inline-flex" href={loginPath(locale, nextPath)}>
                  {dictionary.verifyEmail.logInToResend}
                </Link>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
