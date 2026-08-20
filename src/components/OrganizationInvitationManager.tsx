"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useDictionary } from "@/lib/i18n/locale-context";
import {
  createOrganizationInvitation,
  type OrganizationInvitationState
} from "@/lib/organization-invitation-actions";

const initialState: OrganizationInvitationState = {};

export function OrganizationInvitationManager({ organizationSlug }: { organizationSlug: string }) {
  const dictionary = useDictionary();
  const [state, action] = useFormState(createOrganizationInvitation, initialState);

  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="organizationSlug" value={organizationSlug} />
      <label className="grid gap-1">
        <span className="label">{dictionary.invite.manager.expiresLabel}</span>
        <select className="field" name="expiresInHours" defaultValue="168">
          <option value="24">{dictionary.invite.manager.expires24Hours}</option>
          <option value="72">{dictionary.invite.manager.expires3Days}</option>
          <option value="168">{dictionary.invite.manager.expires7Days}</option>
          <option value="720">{dictionary.invite.manager.expires30Days}</option>
        </select>
      </label>
      <label className="grid gap-1">
        <span className="label">{dictionary.invite.manager.maxUsesLabel}</span>
        <input className="field" name="maxUses" type="number" min="1" max="1000" placeholder={dictionary.invite.manager.maxUsesPlaceholder} />
      </label>
      <p className="text-xs leading-5 text-muted">{dictionary.invite.manager.help}</p>
      <SubmitButton />
      {state.error ? <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-danger">{state.error}</p> : null}
      {state.success ? <p className="rounded-md bg-green-50 p-3 text-sm font-semibold text-success">{state.success}</p> : null}
      {state.invitationUrl ? (
        <div className="rounded-lg border border-green-200 bg-white p-4">
          <p className="text-xs font-black uppercase tracking-wide text-success">{dictionary.invite.manager.linkLabel}</p>
          <label className="mt-2 grid gap-2">
            <span className="sr-only">{dictionary.invite.manager.newLinkLabel}</span>
            <input className="field font-mono text-sm" readOnly value={state.invitationUrl} />
          </label>
          <CopyInvitationButton invitationUrl={state.invitationUrl} />
        </div>
      ) : null}
    </form>
  );
}

function CopyInvitationButton({ invitationUrl }: { invitationUrl: string }) {
  const dictionary = useDictionary();
  const [copied, setCopied] = useState(false);

  return (
    <button
      className="button-secondary mt-3"
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(invitationUrl);
        setCopied(true);
      }}
    >
      {copied ? dictionary.common.copied : dictionary.invite.manager.copyLink}
    </button>
  );
}

function SubmitButton() {
  const dictionary = useDictionary();
  const { pending } = useFormStatus();

  return (
    <button className="button" type="submit" disabled={pending}>
      {pending ? dictionary.common.creating : dictionary.invite.manager.submit}
    </button>
  );
}
