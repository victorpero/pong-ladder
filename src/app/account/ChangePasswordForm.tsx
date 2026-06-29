"use client";

import { useFormState, useFormStatus } from "react-dom";
import { changePassword, type AuthFormState } from "@/lib/auth-actions";

const initialState: AuthFormState = {};

export function ChangePasswordForm() {
  const [state, action] = useFormState(changePassword, initialState);

  return (
    <form action={action} className="grid gap-3">
      <label className="grid gap-1">
        <span className="label">Current password</span>
        <input className="field" name="currentPassword" type="password" autoComplete="current-password" minLength={8} required />
      </label>
      <label className="grid gap-1">
        <span className="label">New password</span>
        <input className="field" name="newPassword" type="password" autoComplete="new-password" minLength={8} required />
      </label>
      <label className="grid gap-1">
        <span className="label">Confirm new password</span>
        <input className="field" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required />
      </label>
      {state.error ? <p className="rounded-md bg-court-50 p-3 text-sm font-semibold text-court-700">{state.error}</p> : null}
      {state.success ? <p className="rounded-md bg-green-50 p-3 text-sm font-semibold text-success">{state.success}</p> : null}
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button className="button" type="submit" disabled={pending}>
      {pending ? "Updating..." : "Update password"}
    </button>
  );
}
