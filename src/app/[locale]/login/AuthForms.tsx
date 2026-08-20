"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";
import { createAccount, login, type AuthFormState } from "@/lib/auth-actions";
import { useDictionary, useLocale } from "@/lib/i18n/locale-context";
import { appPath, postAuthenticationPath } from "@/lib/organization-paths";

const initialState: AuthFormState = {};

export function AuthForms({
  nextPath,
  googleEnabled,
  oauthError
}: {
  nextPath: string;
  googleEnabled: boolean;
  oauthError?: string;
}) {
  const locale = useLocale();
  const dictionary = useDictionary();
  const [mode, setMode] = useState<"login" | "create">("login");
  const [loginState, loginAction] = useFormState(login, initialState);
  const [createState, createAction] = useFormState(createAccount, initialState);

  return (
    <section className="w-full max-w-md rounded-lg border border-line bg-white p-5 shadow-soft sm:p-6">
      <div className="grid grid-cols-2 rounded-md bg-slate-100 p-1">
        <button
          className={`rounded px-3 py-2 text-sm font-bold transition ${
            mode === "login" ? "bg-white text-court-700 shadow-sm" : "text-muted"
          }`}
          type="button"
          onClick={() => setMode("login")}
        >
          {dictionary.login.logInTab}
        </button>
        <button
          className={`rounded px-3 py-2 text-sm font-bold transition ${
            mode === "create" ? "bg-white text-court-700 shadow-sm" : "text-muted"
          }`}
          type="button"
          onClick={() => setMode("create")}
        >
          {dictionary.login.createAccountTab}
        </button>
      </div>

      {googleEnabled ? (
        <div className="mt-5 grid gap-4">
          <GoogleAuthButton callbackURL={postAuthenticationPath(locale, nextPath)} />
          <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-wide text-muted">
            <span className="h-px flex-1 bg-line" />
            {dictionary.login.orUsePassword}
            <span className="h-px flex-1 bg-line" />
          </div>
        </div>
      ) : null}

      {oauthError ? (
        <p className="mt-4 rounded-md bg-court-50 p-3 text-sm font-semibold text-court-700">
          {dictionary.login.googleError}
        </p>
      ) : null}

      {mode === "login" ? (
        <form action={loginAction} className="mt-5 grid gap-4">
          <input type="hidden" name="next" value={nextPath} />
          <label className="grid gap-1">
            <span className="label">{dictionary.login.identifierLabel}</span>
            <input className="field" name="identifier" autoComplete="username" required />
          </label>
          <label className="grid gap-1">
            <span className="label">{dictionary.login.passwordLabel}</span>
            <input className="field" name="password" type="password" autoComplete="current-password" minLength={8} required />
          </label>
          <Link
            className="justify-self-start text-sm font-semibold text-muted transition hover:text-ink"
            href={appPath(locale, "/forgot-password")}
          >
            {dictionary.login.forgotPassword}
          </Link>
          {loginState.error ? <p className="rounded-md bg-court-50 p-3 text-sm font-semibold text-court-700">{loginState.error}</p> : null}
          <SubmitButton label={dictionary.login.logIn} pendingLabel={dictionary.login.loggingIn} />
        </form>
      ) : (
        <form action={createAction} className="mt-5 grid gap-4">
          <input type="hidden" name="next" value={nextPath} />
          <label className="grid gap-1">
            <span className="label">{dictionary.login.usernameLabel}</span>
            <input className="field" name="username" autoComplete="username" minLength={2} required />
          </label>
          <label className="grid gap-1">
            <span className="label">{dictionary.login.displayNameLabel}</span>
            <input
              className="field"
              name="fullName"
              autoComplete="name"
              placeholder={dictionary.login.displayNamePlaceholder}
              minLength={2}
              required
            />
          </label>
          <label className="grid gap-1">
            <span className="label">{dictionary.login.emailLabel}</span>
            <input className="field" name="email" type="email" autoComplete="email" required />
          </label>
          <label className="grid gap-1">
            <span className="label">{dictionary.login.passwordLabel}</span>
            <input className="field" name="password" type="password" autoComplete="new-password" minLength={8} required />
          </label>
          <p className="rounded-md border border-line bg-slate-50 p-3 text-sm font-semibold text-muted">
            {dictionary.login.createAccountHelp}
          </p>
          {createState.error ? <p className="rounded-md bg-court-50 p-3 text-sm font-semibold text-court-700">{createState.error}</p> : null}
          <SubmitButton label={dictionary.login.createAccount} pendingLabel={dictionary.login.creatingAccount} />
        </form>
      )}
    </section>
  );
}

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();

  return (
    <button className="button w-full" type="submit" disabled={pending}>
      {pending ? pendingLabel : label}
    </button>
  );
}
