"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { useDictionary, useLocale } from "@/lib/i18n/locale-context";
import { appPath } from "@/lib/organization-paths";
import { sendPasswordResetLink, type PasswordResetFormState } from "@/lib/password-reset-actions";

const initialState: PasswordResetFormState = {};

export function ForgotPasswordForm() {
  const locale = useLocale();
  const dictionary = useDictionary();
  const [state, formAction] = useFormState(sendPasswordResetLink, initialState);
  const loginHref = appPath(locale, "/login");

  if (state.success) {
    return (
      <div className="mt-6 grid gap-4">
        <p aria-live="polite" className="rounded-md bg-green-50 p-3 text-sm font-semibold text-success">
          {state.success}
        </p>
        <Link className="button inline-flex" href={loginHref}>
          {dictionary.forgotPassword.backToLogin}
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-6 grid gap-4 text-left">
      <label className="grid gap-1">
        <span className="label">{dictionary.forgotPassword.emailLabel}</span>
        <input autoComplete="email" className="field" name="email" required type="email" />
      </label>
      {state.error ? (
        <p aria-live="polite" className="rounded-md bg-court-50 p-3 text-sm font-semibold text-court-700">
          {state.error}
        </p>
      ) : null}
      <SubmitButton />
      <Link className="text-sm font-semibold text-muted transition hover:text-ink" href={loginHref}>
        {dictionary.forgotPassword.backToLogin}
      </Link>
    </form>
  );
}

function SubmitButton() {
  const dictionary = useDictionary();
  const { pending } = useFormStatus();

  return (
    <button className="button w-full" disabled={pending} type="submit">
      {pending ? dictionary.common.sending : dictionary.forgotPassword.submit}
    </button>
  );
}
