"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { LOCALE_NATIVE_NAMES, SUPPORTED_LOCALES } from "@/lib/i18n/config";
import { useDictionary } from "@/lib/i18n/locale-context";
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
  allowedEmailDomains,
  defaultLocale
}: {
  organizationSlug: string;
  organizationName: string;
  organizationType: string;
  visibility: string;
  joinPolicy: string;
  allowedEmailDomains: string[];
  defaultLocale: string;
}) {
  const dictionary = useDictionary();
  const [policyState, policyAction] = useFormState(updateOrganizationJoinPolicy, initialState);
  const [detailsState, detailsAction] = useFormState(updateOrganizationDetails, initialState);
  const [selectedJoinPolicy, setSelectedJoinPolicy] = useState(joinPolicy);
  const settings = dictionary.admin.settings;

  return (
    <section className="section-band xl:col-span-2">
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <p className="label">{settings.label}</p>
          <h2 className="mt-1 text-2xl font-black">{settings.generalHeading}</h2>
          <form action={detailsAction} className="mt-5 grid gap-3">
            <input type="hidden" name="organizationSlug" value={organizationSlug} />
            <label className="grid gap-1">
              <span className="label">{settings.nameLabel}</span>
              <input className="field" name="name" defaultValue={organizationName} minLength={2} maxLength={100} required />
            </label>
            <label className="grid gap-1">
              <span className="label">{settings.slugLabel}</span>
              <input className="field" value={organizationSlug} readOnly />
            </label>
            <p className="text-xs leading-5 text-muted">{settings.slugHelp}</p>
            <label className="grid gap-1">
              <span className="label">{settings.typeLabel}</span>
              <select className="field" name="type" defaultValue={organizationType}>
                {Object.entries(dictionary.organizationTypes).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1">
              <span className="label">{settings.visibilityLabel}</span>
              <select className="field" name="visibility" defaultValue={visibility}>
                {Object.entries(dictionary.organizationVisibility).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-xs leading-5 text-muted">{settings.visibilityHelp}</p>
            <label className="grid gap-1">
              <span className="label">{settings.defaultLocaleLabel}</span>
              <select className="field" name="defaultLocale" defaultValue={defaultLocale}>
                {SUPPORTED_LOCALES.map((locale) => (
                  <option key={locale} value={locale}>
                    {LOCALE_NATIVE_NAMES[locale]}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-xs leading-5 text-muted">{settings.defaultLocaleHelp}</p>
            <SubmitButton label={settings.saveGeneral} pendingLabel={dictionary.common.saving} />
            <FormMessage state={detailsState} />
          </form>
        </div>

        <div>
          <p className="label">{settings.membershipEntryLabel}</p>
          <h2 className="mt-1 text-2xl font-black">{settings.joinPolicyHeading}</h2>
          <p className="mt-2 text-sm leading-6 text-muted">{settings.joinPolicyBody}</p>
          <form action={policyAction} className="mt-5 grid gap-3">
            <input type="hidden" name="organizationSlug" value={organizationSlug} />
            <label className="grid gap-1">
              <span className="label">{settings.policyLabel}</span>
              <select
                className="field"
                name="joinPolicy"
                value={selectedJoinPolicy}
                onChange={(event) => setSelectedJoinPolicy(event.target.value)}
              >
                {Object.entries(dictionary.joinPolicies).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            {selectedJoinPolicy === "EMAIL_DOMAIN" ? (
              <div className="grid gap-1">
                <label className="label" htmlFor="policy-allowed-email-domains">
                  {settings.allowedDomainsLabel}
                </label>
                <input
                  className="field"
                  id="policy-allowed-email-domains"
                  name="allowedEmailDomains"
                  defaultValue={allowedEmailDomains.join(", ")}
                  placeholder={dictionary.createOrganization.allowedDomainsPlaceholder}
                  required
                />
                <p className="text-xs leading-5 text-muted">{settings.allowedDomainsHelp}</p>
              </div>
            ) : null}
            <SubmitButton label={settings.savePolicy} pendingLabel={dictionary.common.saving} />
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
