"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { LOCALE_NATIVE_NAMES, SUPPORTED_LOCALES } from "@/lib/i18n/config";
import { useDictionary, useLocale } from "@/lib/i18n/locale-context";
import { createOrganization, type CreateOrganizationState } from "@/lib/organization-creation-actions";

const initialState: CreateOrganizationState = {};

export function CreateOrganizationForm() {
  const dictionary = useDictionary();
  const activeLocale = useLocale();
  const [state, action] = useFormState(createOrganization, initialState);
  const [joinPolicy, setJoinPolicy] = useState("INVITE_ONLY");
  const copy = dictionary.createOrganization;

  return (
    <form action={action} className="grid gap-4">
      <label className="grid gap-1">
        <span className="label">{copy.nameLabel}</span>
        <input className="field" name="name" minLength={2} maxLength={100} required />
      </label>
      <label className="grid gap-1">
        <span className="label">{copy.slugLabel}</span>
        <input className="field" name="slug" minLength={2} maxLength={60} placeholder={copy.slugPlaceholder} required />
      </label>
      <p className="text-xs leading-5 text-muted">{copy.slugHelp}</p>
      <label className="grid gap-1">
        <span className="label">{copy.typeLabel}</span>
        <select className="field" name="type" defaultValue="WORKPLACE">
          {Object.entries(dictionary.organizationTypes).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1">
        <span className="label">{copy.joinPolicyLabel}</span>
        <select
          className="field"
          name="joinPolicy"
          value={joinPolicy}
          onChange={(event) => setJoinPolicy(event.target.value)}
        >
          {Object.entries(dictionary.joinPolicies).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      {joinPolicy === "EMAIL_DOMAIN" ? (
        <div className="grid gap-1">
          <label className="label" htmlFor="allowed-email-domains">
            {copy.allowedDomainsLabel}
          </label>
          <input
            className="field"
            id="allowed-email-domains"
            name="allowedEmailDomains"
            placeholder={copy.allowedDomainsPlaceholder}
            required
          />
          <p className="text-xs leading-5 text-muted">{copy.allowedDomainsHelp}</p>
        </div>
      ) : null}
      <label className="grid gap-1">
        <span className="label">{copy.visibilityLabel}</span>
        <select className="field" name="visibility" defaultValue="PRIVATE">
          {Object.entries(dictionary.organizationVisibility).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <p className="text-xs leading-5 text-muted">{copy.visibilityHelp}</p>
      <label className="grid gap-1">
        <span className="label">{copy.defaultLocaleLabel}</span>
        <select className="field" name="defaultLocale" defaultValue={activeLocale}>
          {SUPPORTED_LOCALES.map((locale) => (
            <option key={locale} value={locale}>
              {LOCALE_NATIVE_NAMES[locale]}
            </option>
          ))}
        </select>
      </label>
      <p className="text-xs leading-5 text-muted">{copy.defaultLocaleHelp}</p>
      {state.error ? <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-danger">{state.error}</p> : null}
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const dictionary = useDictionary();
  const { pending } = useFormStatus();

  return (
    <button className="button" type="submit" disabled={pending}>
      {pending ? dictionary.common.creating : dictionary.createOrganization.submit}
    </button>
  );
}
