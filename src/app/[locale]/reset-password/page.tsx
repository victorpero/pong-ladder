import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/app/[locale]/reset-password/ResetPasswordForm";
import { LogoMark } from "@/components/LogoMark";
import { toSupportedLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";
import { t } from "@/lib/i18n/format";
import { appPath } from "@/lib/organization-paths";
import { PASSWORD_MIN_LENGTH } from "@/lib/password-policy";

const MAX_TOKEN_LENGTH = 256;

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  return {
    title: getDictionary(params.locale).metadata.resetPasswordTitle,
    // The address carries the reset token, so it must not travel in a Referer header.
    referrer: "no-referrer",
    robots: { index: false, follow: false }
  };
}

function safeToken(value?: string | string[]) {
  const token = Array.isArray(value) ? value[0] : value;

  return token && token.length <= MAX_TOKEN_LENGTH ? token : null;
}

export default function ResetPasswordPage({
  params,
  searchParams
}: {
  params: { locale: string };
  searchParams: { token?: string | string[] };
}) {
  const locale = toSupportedLocale(params.locale);
  const dictionary = getDictionary(locale);
  const token = safeToken(searchParams.token);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-lg items-center justify-center">
        <section className="section-band w-full text-center">
          <div className="mb-5 flex justify-center">
            <LogoMark />
          </div>
          <p className="label">{dictionary.resetPassword.label}</p>
          {token ? (
            <>
              <h1 className="mt-2 text-3xl font-black">{dictionary.resetPassword.heading}</h1>
              <p className="mt-3 text-sm leading-6 text-muted">{dictionary.resetPassword.body}</p>
              <ResetPasswordForm minLength={PASSWORD_MIN_LENGTH} token={token} />
            </>
          ) : (
            <>
              <h1 className="mt-2 text-3xl font-black">{dictionary.resetPassword.invalidHeading}</h1>
              <p className="mt-3 text-sm leading-6 text-muted">{dictionary.resetPassword.invalidBody}</p>
              <Link className="button mt-6 inline-flex" href={appPath(locale, "/forgot-password")}>
                {dictionary.resetPassword.requestNewLink}
              </Link>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
