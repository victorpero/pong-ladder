"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { sendPasswordResetLink, type PasswordResetFormState } from "@/lib/password-reset-actions";

const initialState: PasswordResetFormState = {};

export function ForgotPasswordForm() {
  const [state, formAction] = useFormState(sendPasswordResetLink, initialState);

  if (state.success) {
    return (
      <div className="mt-6 grid gap-4">
        <p aria-live="polite" className="rounded-md bg-green-50 p-3 text-sm font-semibold text-success">
          {state.success}
        </p>
        <Link className="button inline-flex" href="/login">
          Back to log in
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-6 grid gap-4 text-left">
      <label className="grid gap-1">
        <span className="label">Email</span>
        <input autoComplete="email" className="field" name="email" required type="email" />
      </label>
      {state.error ? (
        <p aria-live="polite" className="rounded-md bg-court-50 p-3 text-sm font-semibold text-court-700">
          {state.error}
        </p>
      ) : null}
      <SubmitButton />
      <Link className="text-sm font-semibold text-muted transition hover:text-ink" href="/login">
        Back to log in
      </Link>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button className="button w-full" disabled={pending} type="submit">
      {pending ? "Sending..." : "Send reset link"}
    </button>
  );
}
