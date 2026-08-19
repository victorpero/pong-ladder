"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useDictionary } from "@/lib/i18n/locale-context";
import { t } from "@/lib/i18n/format";
import {
  resendVerificationEmail,
  updateVerificationEmail,
  type VerificationFormState
} from "@/lib/verification-actions";

const initialState: VerificationFormState = {};

export function VerificationControls({ email, nextPath }: { email: string; nextPath: string }) {
  const dictionary = useDictionary();
  const [resendState, resendAction] = useFormState(resendVerificationEmail, initialState);
  const [emailState, emailAction] = useFormState(updateVerificationEmail, initialState);

  return (
    <div className="mt-6 grid gap-5 text-left">
      <form action={resendAction} className="grid gap-3">
        <input type="hidden" name="next" value={nextPath} />
        <p className="text-sm text-muted">{t(dictionary.verifyEmail.currentEmail, { email })}</p>
        <SubmitButton label={dictionary.verifyEmail.resend} pendingLabel={dictionary.verifyEmail.resending} />
        <FormMessage state={resendState} />
      </form>

      <form action={emailAction} className="grid gap-3 border-t border-line pt-5">
        <input type="hidden" name="next" value={nextPath} />
        <label className="grid gap-1">
          <span className="label">{dictionary.verifyEmail.differentEmailLabel}</span>
          <input className="field" name="email" type="email" autoComplete="email" required />
        </label>
        <SubmitButton label={dictionary.verifyEmail.changeEmail} pendingLabel={dictionary.common.updating} />
        <FormMessage state={emailState} />
      </form>
    </div>
  );
}

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();

  return (
    <button className="button-secondary" type="submit" disabled={pending}>
      {pending ? pendingLabel : label}
    </button>
  );
}

function FormMessage({ state }: { state: VerificationFormState }) {
  if (state.error) {
    return <p className="rounded-md bg-court-50 p-3 text-sm font-semibold text-court-700">{state.error}</p>;
  }

  if (state.success) {
    return <p className="rounded-md bg-green-50 p-3 text-sm font-semibold text-success">{state.success}</p>;
  }

  return null;
}
