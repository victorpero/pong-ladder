import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/app/reset-password/ResetPasswordForm";
import { LogoMark } from "@/components/LogoMark";
import { PASSWORD_MIN_LENGTH } from "@/lib/password-policy";

const MAX_TOKEN_LENGTH = 256;

export const metadata: Metadata = {
  title: "Reset password",
  // The address carries the reset token, so it must not travel in a Referer header.
  referrer: "no-referrer",
  robots: { index: false, follow: false }
};

function safeToken(value?: string | string[]) {
  const token = Array.isArray(value) ? value[0] : value;

  return token && token.length <= MAX_TOKEN_LENGTH ? token : null;
}

export default function ResetPasswordPage({
  searchParams
}: {
  searchParams: { token?: string | string[] };
}) {
  const token = safeToken(searchParams.token);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-lg items-center justify-center">
        <section className="section-band w-full text-center">
          <div className="mb-5 flex justify-center">
            <LogoMark />
          </div>
          <p className="label">Account access</p>
          {token ? (
            <>
              <h1 className="mt-2 text-3xl font-black">Choose a new password</h1>
              <p className="mt-3 text-sm leading-6 text-muted">
                Set the password you will use to log in. Finishing here signs out every device that
                is currently using your account.
              </p>
              <ResetPasswordForm minLength={PASSWORD_MIN_LENGTH} token={token} />
            </>
          ) : (
            <>
              <h1 className="mt-2 text-3xl font-black">Reset link not recognized</h1>
              <p className="mt-3 text-sm leading-6 text-muted">
                This password reset link is incomplete or no longer valid. Request a new one and use
                the most recent email.
              </p>
              <Link className="button mt-6 inline-flex" href="/forgot-password">
                Request a new link
              </Link>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
