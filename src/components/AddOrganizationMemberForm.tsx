"use client";

import { useFormState, useFormStatus } from "react-dom";
import { PlayerCombobox, type PlayerOption } from "@/components/PlayerCombobox";
import { useDictionary } from "@/lib/i18n/locale-context";
import {
  addExistingOrganizationMember,
  type MembershipAdminState
} from "@/lib/membership-admin-actions";

const initialState: MembershipAdminState = {};

export function AddOrganizationMemberForm({
  organizationSlug,
  users
}: {
  organizationSlug: string;
  users: PlayerOption[];
}) {
  const dictionary = useDictionary();
  const [state, action] = useFormState(addExistingOrganizationMember, initialState);

  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="organizationSlug" value={organizationSlug} />
      <PlayerCombobox
        name="userId"
        label={dictionary.admin.verifiedAccountLabel}
        players={users}
        disabled={users.length === 0}
      />
      {state.error ? <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-danger">{state.error}</p> : null}
      {state.success ? <p className="rounded-md bg-green-50 p-3 text-sm font-semibold text-success">{state.success}</p> : null}
      <SubmitButton disabled={users.length === 0} />
    </form>
  );
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const dictionary = useDictionary();
  const { pending } = useFormStatus();

  return (
    <button className="button" type="submit" disabled={disabled || pending}>
      {pending ? dictionary.common.adding : dictionary.admin.addMemberButton}
    </button>
  );
}
