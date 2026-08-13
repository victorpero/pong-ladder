"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
  disableOrganizationAccessCode,
  rotateOrganizationAccessCode,
  updateOrganizationJoinPolicy,
  type OrganizationPolicyState
} from "@/lib/organization-policy-actions";

const initialState: OrganizationPolicyState = {};

export function OrganizationPolicySettings({
  organizationSlug,
  joinPolicy,
  allowedEmailDomains,
  accessCodeEnabled,
  accessCodeUpdatedAt
}: {
  organizationSlug: string;
  joinPolicy: string;
  allowedEmailDomains: string[];
  accessCodeEnabled: boolean;
  accessCodeUpdatedAt: string | null;
}) {
  const [policyState, policyAction] = useFormState(updateOrganizationJoinPolicy, initialState);
  const [rotateState, rotateAction] = useFormState(rotateOrganizationAccessCode, initialState);
  const [disableState, disableAction] = useFormState(disableOrganizationAccessCode, initialState);

  return (
    <section className="section-band xl:col-span-2">
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <p className="label">Membership entry</p>
          <h2 className="mt-1 text-2xl font-black">Join policy</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Choose how verified accounts may become members of this organization.
          </p>
          <form action={policyAction} className="mt-5 grid gap-3">
            <input type="hidden" name="organizationSlug" value={organizationSlug} />
            <label className="grid gap-1">
              <span className="label">Policy</span>
              <select className="field" name="joinPolicy" defaultValue={joinPolicy}>
                <option value="OPEN">Open</option>
                <option value="ADMIN_APPROVAL">Administrator approval</option>
                <option value="INVITE_ONLY">Invitation only</option>
                <option value="EMAIL_DOMAIN">Verified email domain</option>
                <option value="ACCESS_CODE">Organization code</option>
              </select>
            </label>
            <label className="grid gap-1">
              <span className="label">Allowed email domains</span>
              <input
                className="field"
                name="allowedEmailDomains"
                defaultValue={allowedEmailDomains.join(", ")}
                placeholder="example.com, subsidiary.example.com"
              />
            </label>
            <p className="text-xs leading-5 text-muted">Domains are matched exactly after normalization.</p>
            <SubmitButton label="Save policy" pendingLabel="Saving..." />
            <FormMessage state={policyState} />
          </form>
        </div>

        <div className="rounded-lg border border-line bg-slate-50 p-4">
          <p className="label">Organization code</p>
          <h3 className="mt-1 text-xl font-black">{accessCodeEnabled ? "Code enabled" : "Code disabled"}</h3>
          <p className="mt-2 text-sm leading-6 text-muted">
            Generating a new code immediately invalidates the previous one. Only its hash is stored.
          </p>
          {accessCodeUpdatedAt ? (
            <p className="mt-2 text-xs font-semibold text-muted">
              Last changed {new Date(accessCodeUpdatedAt).toLocaleString()}
            </p>
          ) : null}
          <form action={rotateAction} className="mt-5 grid gap-3">
            <input type="hidden" name="organizationSlug" value={organizationSlug} />
            <SubmitButton label={accessCodeEnabled ? "Rotate code" : "Generate code"} pendingLabel="Generating..." />
            <FormMessage state={rotateState} />
            {rotateState.accessCode ? (
              <div className="rounded-lg border border-green-200 bg-white p-4">
                <p className="text-xs font-black uppercase tracking-wide text-success">Copy this code now</p>
                <p className="mt-2 break-all font-mono text-xl font-black tracking-widest text-ink">
                  {rotateState.accessCode}
                </p>
                <p className="mt-2 text-xs text-muted">It will not be shown again.</p>
              </div>
            ) : null}
          </form>
          {accessCodeEnabled ? (
            <form action={disableAction} className="mt-3 grid gap-3">
              <input type="hidden" name="organizationSlug" value={organizationSlug} />
              <SubmitButton label="Disable code" pendingLabel="Disabling..." danger />
              <FormMessage state={disableState} />
            </form>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function SubmitButton({
  label,
  pendingLabel,
  danger = false
}: {
  label: string;
  pendingLabel: string;
  danger?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button className={danger ? "button-danger" : "button"} type="submit" disabled={pending}>
      {pending ? pendingLabel : label}
    </button>
  );
}

function FormMessage({ state }: { state: OrganizationPolicyState }) {
  if (state.error) {
    return <p className="rounded-md bg-court-50 p-3 text-sm font-semibold text-court-700">{state.error}</p>;
  }

  if (state.success) {
    return <p className="rounded-md bg-green-50 p-3 text-sm font-semibold text-success">{state.success}</p>;
  }

  return null;
}
