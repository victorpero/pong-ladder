"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  createOrganizationInvitation,
  type OrganizationInvitationState
} from "@/lib/organization-invitation-actions";

const initialState: OrganizationInvitationState = {};

export function OrganizationInvitationManager({ organizationSlug }: { organizationSlug: string }) {
  const [state, action] = useFormState(createOrganizationInvitation, initialState);

  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="organizationSlug" value={organizationSlug} />
      <label className="grid gap-1">
        <span className="label">Expires after</span>
        <select className="field" name="expiresInHours" defaultValue="168">
          <option value="24">24 hours</option>
          <option value="72">3 days</option>
          <option value="168">7 days</option>
          <option value="720">30 days</option>
        </select>
      </label>
      <label className="grid gap-1">
        <span className="label">Maximum uses</span>
        <input className="field" name="maxUses" type="number" min="1" max="1000" placeholder="Unlimited" />
      </label>
      <p className="text-xs leading-5 text-muted">
        Leave maximum uses empty for an unlimited link. A verified account becomes an active member immediately.
      </p>
      <SubmitButton />
      {state.error ? <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-danger">{state.error}</p> : null}
      {state.success ? <p className="rounded-md bg-green-50 p-3 text-sm font-semibold text-success">{state.success}</p> : null}
      {state.invitationUrl ? (
        <div className="rounded-lg border border-green-200 bg-white p-4">
          <p className="text-xs font-black uppercase tracking-wide text-success">Invitation link</p>
          <label className="mt-2 grid gap-2">
            <span className="sr-only">New invitation link</span>
            <input className="field font-mono text-sm" readOnly value={state.invitationUrl} />
          </label>
          <CopyInvitationButton invitationUrl={state.invitationUrl} />
        </div>
      ) : null}
    </form>
  );
}

function CopyInvitationButton({ invitationUrl }: { invitationUrl: string }) {
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
      {copied ? "Copied" : "Copy invitation link"}
    </button>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button className="button" type="submit" disabled={pending}>
      {pending ? "Creating..." : "Create invitation"}
    </button>
  );
}
