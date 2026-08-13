"use client";

import { useFormState, useFormStatus } from "react-dom";
import { PlayerCombobox, type PlayerOption } from "@/components/PlayerCombobox";
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
  const [state, action] = useFormState(addExistingOrganizationMember, initialState);

  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="organizationSlug" value={organizationSlug} />
      <PlayerCombobox name="userId" label="Verified account" players={users} disabled={users.length === 0} />
      {state.error ? <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-danger">{state.error}</p> : null}
      {state.success ? <p className="rounded-md bg-green-50 p-3 text-sm font-semibold text-success">{state.success}</p> : null}
      <SubmitButton disabled={users.length === 0} />
    </form>
  );
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button className="button" type="submit" disabled={disabled || pending}>
      {pending ? "Adding..." : "Add organization member"}
    </button>
  );
}
