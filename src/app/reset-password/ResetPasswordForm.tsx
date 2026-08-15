"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { resetPassword, type PasswordResetFormState } from "@/lib/password-reset-actions";

const initialState: PasswordResetFormState = {};

export function ResetPasswordForm({ token, minLength }: { token: string; minLength: number }) {
  const [state, formAction] = useFormState(resetPassword, initialState);

  if (state.success) {
    return (
      <div className="mt-6 grid gap-4">
        <p aria-live="polite" className="rounded-md bg-green-50 p-3 text-sm font-semibold text-success">
          {state.success}
        </p>
        <Link className="button inline-flex" href="/login">
          Go to log in
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-6 grid gap-4 text-left">
      <input name="token" type="hidden" value={token} />
      <label className="grid gap-1">
        <span className="label">New password</span>
        <input
          autoComplete="new-password"
          className="field"
          minLength={minLength}
          name="password"
          required
          type="password"
        />
      </label>
      <label className="grid gap-1">
        <span className="label">Confirm new password</span>
        <input
          autoComplete="new-password"
          className="field"
          minLength={minLength}
          name="confirmPassword"
          required
          type="password"
        />
      </label>
      <p className="text-sm text-muted">Use at least {minLength} characters.</p>
      {state.error ? (
        <p aria-live="polite" className="rounded-md bg-court-50 p-3 text-sm font-semibold text-court-700">
          {state.error}
        </p>
      ) : null}
      <SubmitButton />
      <Link className="text-sm font-semibold text-muted transition hover:text-ink" href="/forgot-password">
        Request a new link
      </Link>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button className="button w-full" disabled={pending} type="submit">
      {pending ? "Updating..." : "Update password"}
    </button>
  );
}
