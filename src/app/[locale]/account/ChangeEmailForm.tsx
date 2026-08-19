"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useDictionary } from "@/lib/i18n/locale-context";
import { updateVerificationEmail, type VerificationFormState } from "@/lib/verification-actions";

const initialState: VerificationFormState = {};

export function ChangeEmailForm() {
  const dictionary = useDictionary();
  const [state, action] = useFormState(updateVerificationEmail, initialState);

  return (
    <form action={action} className="grid gap-3">
      <label className="grid gap-1">
        <span className="label">{dictionary.account.changeEmailForm.newEmail}</span>
        <input className="field" name="email" type="email" autoComplete="email" required />
      </label>
      <p className="text-sm leading-6 text-muted">{dictionary.account.changeEmailForm.help}</p>
      {state.error ? <p className="rounded-md bg-court-50 p-3 text-sm font-semibold text-court-700">{state.error}</p> : null}
      {state.success ? <p className="rounded-md bg-green-50 p-3 text-sm font-semibold text-success">{state.success}</p> : null}
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const dictionary = useDictionary();
  const { pending } = useFormStatus();

  return (
    <button className="button-secondary" type="submit" disabled={pending}>
      {pending ? dictionary.common.updating : dictionary.account.changeEmailForm.submit}
    </button>
  );
}
