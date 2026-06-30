"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createAccount, login, type AuthFormState } from "@/lib/auth-actions";

const initialState: AuthFormState = {};

export function AuthForms({ nextPath }: { nextPath: string }) {
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
          <label className="flex items-start gap-3 rounded-md border border-line bg-slate-50 p-3">
            <input className="mt-1 h-4 w-4" name="joinCurrentSeason" type="checkbox" defaultChecked />
            <span>
              <span className="block text-sm font-bold">Join current season</span>
              <span className="mt-1 block text-xs leading-5 text-muted">
                Join now to appear on the ladder and become available for matches and challenges.
              </span>
            </span>
          </label>
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
