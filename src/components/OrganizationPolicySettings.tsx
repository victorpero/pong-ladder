"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  updateOrganizationDetails,
  updateOrganizationJoinPolicy,
  type OrganizationPolicyState
} from "@/lib/organization-policy-actions";

const initialState: OrganizationPolicyState = {};

export function OrganizationPolicySettings({
  organizationSlug,
  organizationName,
  organizationType,
  visibility,
  joinPolicy,
  allowedEmailDomains
}: {
  organizationSlug: string;
  organizationName: string;
  organizationType: string;
  visibility: string;
  joinPolicy: string;
  allowedEmailDomains: string[];
}) {
  const [policyState, policyAction] = useFormState(updateOrganizationJoinPolicy, initialState);
  const [detailsState, detailsAction] = useFormState(updateOrganizationDetails, initialState);
  const [selectedJoinPolicy, setSelectedJoinPolicy] = useState(joinPolicy);

  return (
    <section className="section-band xl:col-span-2">
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <p className="label">Organization settings</p>
          <h2 className="mt-1 text-2xl font-black">General</h2>
          <form action={detailsAction} className="mt-5 grid gap-3">
            <input type="hidden" name="organizationSlug" value={organizationSlug} />
            <label className="grid gap-1">
              <span className="label">Name</span>
              <input className="field" name="name" defaultValue={organizationName} minLength={2} maxLength={100} required />
            </label>
            <label className="grid gap-1">
              <span className="label">URL slug</span>
              <input className="field" value={organizationSlug} readOnly />
            </label>
            <p className="text-xs leading-5 text-muted">
              URL slugs are fixed after creation so saved links and invitations cannot silently break.
            </p>
            <label className="grid gap-1">
              <span className="label">Type</span>
              <select className="field" name="type" defaultValue={organizationType}>
                <option value="WORKPLACE">Workplace</option>
                <option value="SPORTS_CLUB">Sports club</option>
                <option value="SCHOOL">School</option>
                <option value="FRIENDS">Friends</option>
                <option value="OTHER">Other</option>
              </select>
            </label>
            <label className="grid gap-1">
              <span className="label">Visibility</span>
              <select className="field" name="visibility" defaultValue={visibility}>
                <option value="PRIVATE">Private</option>
                <option value="DISCOVERABLE">Discoverable</option>
              </select>
            </label>
            <p className="text-xs leading-5 text-muted">
              Code and invitation-only organizations remain hidden even when discoverability is selected.
            </p>
            <SubmitButton label="Save general settings" pendingLabel="Saving..." />
            <FormMessage state={detailsState} />
          </form>
        </div>

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
              <select
                className="field"
                name="joinPolicy"
                value={selectedJoinPolicy}
                onChange={(event) => setSelectedJoinPolicy(event.target.value)}
              >
                <option value="OPEN">Open</option>
                <option value="ADMIN_APPROVAL">Administrator approval</option>
                <option value="INVITE_ONLY">Invitation only</option>
                <option value="EMAIL_DOMAIN">Verified email domain</option>
                <option value="ACCESS_CODE">Organization code</option>
              </select>
            </label>
            {selectedJoinPolicy === "EMAIL_DOMAIN" ? (
              <div className="grid gap-1">
                <label className="label" htmlFor="policy-allowed-email-domains">
                  Allowed email domains
                </label>
                <input
                  className="field"
                  id="policy-allowed-email-domains"
                  name="allowedEmailDomains"
                  defaultValue={allowedEmailDomains.join(", ")}
                  placeholder="example.com, subsidiary.example.com"
                  required
                />
                <p className="text-xs leading-5 text-muted">
                  Domains are matched exactly after normalization. Separate multiple domains with commas.
                </p>
              </div>
            ) : null}
            <SubmitButton label="Save policy" pendingLabel="Saving..." />
            <FormMessage state={policyState} />
          </form>
        </div>

      </div>
    </section>
  );
}

function SubmitButton({
  label,
  pendingLabel
}: {
  label: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button className="button" type="submit" disabled={pending}>
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
