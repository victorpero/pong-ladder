import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/app/forgot-password/ForgotPasswordForm";
import { LogoMark } from "@/components/LogoMark";

export const metadata: Metadata = {
  title: "Forgot password"
};

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-lg items-center justify-center">
        <section className="section-band w-full text-center">
          <div className="mb-5 flex justify-center">
            <LogoMark />
          </div>
          <p className="label">Account access</p>
          <h1 className="mt-2 text-3xl font-black">Forgot your password?</h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            Enter the email address on your account and we will send a link for choosing a new
            password. The link works once and expires shortly after it is sent.
          </p>
          <ForgotPasswordForm />
        </section>
      </div>
    </main>
  );
}
