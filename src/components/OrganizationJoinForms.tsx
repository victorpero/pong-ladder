"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
  joinOrganizationByPolicy,
  joinOrganizationWithAccessCode,
  type OrganizationJoinState
} from "@/lib/organization-join-actions";

const initialState: OrganizationJoinState = {};

export function OrganizationAccessCodeForm() {
  const [state, action] = useFormState(joinOrganizationWithAccessCode, initialState);

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
      <label className="grid gap-1">
        <span className="label">Organization code</span>
        <input
          className="field font-mono uppercase tracking-wider"
          name="accessCode"
          autoComplete="off"
          placeholder="XXXX-XXXX-XXXX"
          minLength={12}
          maxLength={20}
          required
        />
      </label>
      <JoinButton label="Join organization" pendingLabel="Checking..." />
      <JoinMessage state={state} className="sm:col-span-2" />
    </form>
  );
}

export function OrganizationPolicyJoinForm({
  organizationId,
  label
}: {
  organizationId: string;
  label: string;
}) {
  const [state, action] = useFormState(joinOrganizationByPolicy, initialState);

  return (
    <form action={action} className="mt-4 grid gap-3">
      <input type="hidden" name="organizationId" value={organizationId} />
      <JoinButton label={label} pendingLabel="Joining..." />
      <JoinMessage state={state} />
    </form>
  );
}

function JoinButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();

  return (
    <button className="button" type="submit" disabled={pending}>
      {pending ? pendingLabel : label}
    </button>
  );
}

function JoinMessage({ state, className = "" }: { state: OrganizationJoinState; className?: string }) {
  if (!state.message) {
    return null;
  }

  const success = state.outcome === "active" || state.outcome === "already_member";
  const pending = state.outcome === "pending";
  const tone = success
    ? "border-green-200 bg-green-50 text-success"
    : pending
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : "border-court-200 bg-court-50 text-court-700";

  return <p className={`rounded-md border p-3 text-sm font-semibold ${tone} ${className}`}>{state.message}</p>;
}
