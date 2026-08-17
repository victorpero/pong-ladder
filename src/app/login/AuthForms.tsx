"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";
import { createAccount, login, type AuthFormState } from "@/lib/auth-actions";
import { postAuthenticationPath } from "@/lib/organization-paths";

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
          Log in
        </button>
        <button
          className={`rounded px-3 py-2 text-sm font-bold transition ${
            mode === "create" ? "bg-white text-court-700 shadow-sm" : "text-muted"
          }`}
          type="button"
          onClick={() => setMode("create")}
        >
          Create account
        </button>
      </div>

      {googleEnabled ? (
        <div className="mt-5 grid gap-4">
          <GoogleAuthButton callbackURL={postAuthenticationPath(nextPath)} />
          <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-wide text-muted">
            <span className="h-px flex-1 bg-line" />
            or use a password
            <span className="h-px flex-1 bg-line" />
          </div>
        </div>
      ) : null}

      {oauthError ? (
        <p className="mt-4 rounded-md bg-court-50 p-3 text-sm font-semibold text-court-700">
          Google sign-in could not be completed. If this email already has an account, log in with your password and link Google from Account.
        </p>
      ) : null}

      {mode === "login" ? (
        <form action={loginAction} className="mt-5 grid gap-4">
          <input type="hidden" name="next" value={nextPath} />
          <label className="grid gap-1">
            <span className="label">Email or username</span>
            <input className="field" name="identifier" autoComplete="username" required />
          </label>
          <label className="grid gap-1">
            <span className="label">Password</span>
            <input className="field" name="password" type="password" autoComplete="current-password" minLength={8} required />
          </label>
          <Link className="justify-self-start text-sm font-semibold text-muted transition hover:text-ink" href="/forgot-password">
            Forgot password?
          </Link>
          {loginState.error ? <p className="rounded-md bg-court-50 p-3 text-sm font-semibold text-court-700">{loginState.error}</p> : null}
          <SubmitButton label="Log in" pendingLabel="Checking..." />
        </form>
      ) : (
        <form action={createAction} className="mt-5 grid gap-4">
          <input type="hidden" name="next" value={nextPath} />
          <label className="grid gap-1">
            <span className="label">Username</span>
            <input className="field" name="username" autoComplete="username" minLength={2} required />
          </label>
          <label className="grid gap-1">
            <span className="label">Display name</span>
            <input className="field" name="fullName" autoComplete="name" placeholder="Victor Olofsson" minLength={2} required />
          </label>
          <label className="grid gap-1">
            <span className="label">Email</span>
            <input className="field" name="email" type="email" autoComplete="email" required />
          </label>
          <label className="grid gap-1">
            <span className="label">Password</span>
            <input className="field" name="password" type="password" autoComplete="new-password" minLength={8} required />
          </label>
          <p className="rounded-md border border-line bg-slate-50 p-3 text-sm font-semibold text-muted">
            Verify your email, then join an organization using its code, invitation, or configured join policy.
          </p>
          {createState.error ? <p className="rounded-md bg-court-50 p-3 text-sm font-semibold text-court-700">{createState.error}</p> : null}
          <SubmitButton label="Create account" pendingLabel="Creating..." />
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
