"use client";

import { useFormState, useFormStatus } from "react-dom";
import { PlayerCombobox, type PlayerOption } from "@/components/PlayerCombobox";
import { adminAddSeasonPlayer, type AdminFormState } from "@/lib/admin-actions";
import { useDictionary } from "@/lib/i18n/locale-context";

const initialState: AdminFormState = {};

export function AddSeasonPlayerForm({
  seasonId,
  players,
  organizationSlug
}: {
  seasonId: string;
  players: PlayerOption[];
  organizationSlug: string;
}) {
  const dictionary = useDictionary();
  const [state, action] = useFormState(adminAddSeasonPlayer, initialState);

  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="organizationSlug" value={organizationSlug} />
      <input type="hidden" name="seasonId" value={seasonId} />
      <PlayerCombobox
        name="userId"
        label={dictionary.admin.playerLabel}
        players={players}
        disabled={players.length === 0}
      />
      {state.error ? <p className="rounded-md bg-court-50 p-3 text-sm font-semibold text-court-700">{state.error}</p> : null}
      {state.success ? <p className="rounded-md bg-green-50 p-3 text-sm font-semibold text-success">{state.success}</p> : null}
      <SubmitButton disabled={players.length === 0} />
    </form>
  );
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const dictionary = useDictionary();
  const { pending } = useFormStatus();

  return (
    <button className="button" type="submit" disabled={disabled || pending}>
      {pending ? dictionary.common.adding : dictionary.admin.addToSeasonButton}
    </button>
  );
}
