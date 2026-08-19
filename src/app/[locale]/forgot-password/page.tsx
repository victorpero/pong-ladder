import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/app/[locale]/forgot-password/ForgotPasswordForm";
import { LogoMark } from "@/components/LogoMark";
import { getDictionary } from "@/lib/i18n/dictionary";

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  return { title: getDictionary(params.locale).metadata.forgotPasswordTitle };
}

export default function ForgotPasswordPage({ params }: { params: { locale: string } }) {
  const dictionary = getDictionary(params.locale);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-lg items-center justify-center">
        <section className="section-band w-full text-center">
          <div className="mb-5 flex justify-center">
            <LogoMark />
          </div>
          <p className="label">{dictionary.forgotPassword.label}</p>
          <h1 className="mt-2 text-3xl font-black">{dictionary.forgotPassword.heading}</h1>
          <p className="mt-3 text-sm leading-6 text-muted">{dictionary.forgotPassword.body}</p>
          <ForgotPasswordForm />
        </section>
      </div>
    </main>
  );
}
