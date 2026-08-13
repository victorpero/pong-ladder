import Link from "next/link";
import { VerificationControls } from "@/app/verify-email/VerificationControls";
import { LogoMark } from "@/components/LogoMark";
import { getSessionUser } from "@/lib/authz";
import { postAuthenticationPath } from "@/lib/organization-paths";

export const dynamic = "force-dynamic";

function safeNextPath(value?: string | string[]) {
  const path = Array.isArray(value) ? value[0] : value;
  const safePath = path?.startsWith("/") && !path.startsWith("//") ? path : null;
  return postAuthenticationPath(safePath);
}

export default async function VerifyEmailPage({
  searchParams
}: {
  searchParams: {
    status?: string | string[];
    delivery?: string | string[];
    next?: string | string[];
  };
}) {
  const sessionUser = await getSessionUser();
  const status = Array.isArray(searchParams.status) ? searchParams.status[0] : searchParams.status;
  const delivery = Array.isArray(searchParams.delivery) ? searchParams.delivery[0] : searchParams.delivery;
  const nextPath = safeNextPath(searchParams.next);
  const verified = status === "verified" || Boolean(sessionUser?.user.emailVerifiedAt);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-lg items-center justify-center">
        <section className="section-band w-full text-center">
          <div className="mb-5 flex justify-center">
            <LogoMark />
          </div>
          <p className="label">Verified identity</p>
          {verified ? (
            <>
              <h1 className="mt-2 text-3xl font-black">Email verified</h1>
              <p className="mt-3 text-sm leading-6 text-muted">
                Your email address is confirmed. You can continue to Pong Ladder.
              </p>
              <Link className="button mt-6 inline-flex" href={nextPath}>
                Continue
              </Link>
            </>
          ) : (
            <>
              <h1 className="mt-2 text-3xl font-black">Check your email</h1>
              <p className="mt-3 text-sm leading-6 text-muted">
                Open the verification link we sent before entering an organization or using ladder features.
              </p>
              {status === "invalid" ? (
                <p className="mt-4 rounded-md bg-court-50 p-3 text-sm font-semibold text-court-700">
                  That verification link is invalid, expired, or has already been used.
                </p>
              ) : null}
              {delivery === "failed" ? (
                <p className="mt-4 rounded-md bg-court-50 p-3 text-sm font-semibold text-court-700">
                  Your account was created, but the first email could not be delivered. Try resending it below.
                </p>
              ) : null}
              {sessionUser ? (
                <VerificationControls email={sessionUser.user.email} nextPath={nextPath} />
              ) : (
                <Link className="button mt-6 inline-flex" href={`/login?next=${encodeURIComponent(nextPath)}`}>
                  Log in to resend
                </Link>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
