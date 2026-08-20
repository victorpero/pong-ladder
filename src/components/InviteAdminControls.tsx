"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useDictionary } from "@/lib/i18n/locale-context";
import {
  rotateOrganizationAccessCode,
  type OrganizationPolicyState
} from "@/lib/organization-policy-actions";

const initialState: OrganizationPolicyState = {};

export function InviteAdminControls({
  organizationSlug,
  hasExistingCode
}: {
  organizationSlug: string;
  hasExistingCode: boolean;
}) {
  const [state, action] = useFormState(rotateOrganizationAccessCode, initialState);

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
      <input type="hidden" name="organizationSlug" value={organizationSlug} />
      <RotateButton hasExistingCode={hasExistingCode} />
      {state.error ? <p className="text-sm font-semibold text-danger">{state.error}</p> : null}
      {state.success ? <p className="text-sm font-semibold text-success">{state.success}</p> : null}
    </form>
  );
}

function RotateButton({ hasExistingCode }: { hasExistingCode: boolean }) {
  const dictionary = useDictionary();
  const { pending } = useFormStatus();

  return (
    <button className="button" type="submit" disabled={pending}>
      {pending
        ? dictionary.invite.generating
        : hasExistingCode
          ? dictionary.invite.rotateCode
          : dictionary.invite.generateCode}
    </button>
  );
}
