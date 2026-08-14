"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createOrganization, type CreateOrganizationState } from "@/lib/organization-creation-actions";

const initialState: CreateOrganizationState = {};

export function CreateOrganizationForm() {
  const [state, action] = useFormState(createOrganization, initialState);
  const [joinPolicy, setJoinPolicy] = useState("INVITE_ONLY");

  return (
    <form action={action} className="grid gap-4">
      <label className="grid gap-1">
        <span className="label">Organization name</span>
        <input className="field" name="name" minLength={2} maxLength={100} required />
      </label>
      <label className="grid gap-1">
        <span className="label">URL slug</span>
        <input className="field" name="slug" minLength={2} maxLength={60} placeholder="stockholm-table-tennis" required />
      </label>
      <p className="text-xs leading-5 text-muted">
        The slug is normalized and cannot be changed later because it is part of every organization URL.
      </p>
      <label className="grid gap-1">
        <span className="label">Organization type</span>
        <select className="field" name="type" defaultValue="WORKPLACE">
          <option value="WORKPLACE">Workplace</option>
          <option value="SPORTS_CLUB">Sports club</option>
          <option value="SCHOOL">School</option>
          <option value="FRIENDS">Friends</option>
          <option value="OTHER">Other</option>
        </select>
      </label>
      <label className="grid gap-1">
        <span className="label">Initial join policy</span>
        <select
          className="field"
          name="joinPolicy"
          value={joinPolicy}
          onChange={(event) => setJoinPolicy(event.target.value)}
        >
          <option value="OPEN">Open</option>
          <option value="ADMIN_APPROVAL">Administrator approval</option>
          <option value="INVITE_ONLY">Invitation only</option>
          <option value="EMAIL_DOMAIN">Verified email domain</option>
          <option value="ACCESS_CODE">Organization code</option>
        </select>
      </label>
      {joinPolicy === "EMAIL_DOMAIN" ? (
        <div className="grid gap-1">
          <label className="label" htmlFor="allowed-email-domains">
            Allowed email domains
          </label>
          <input
            className="field"
            id="allowed-email-domains"
            name="allowedEmailDomains"
            placeholder="example.com, subsidiary.example.com"
            required
          />
          <p className="text-xs leading-5 text-muted">Separate multiple domains with commas.</p>
        </div>
      ) : null}
      <label className="grid gap-1">
        <span className="label">Visibility</span>
        <select className="field" name="visibility" defaultValue="PRIVATE">
          <option value="PRIVATE">Private</option>
          <option value="DISCOVERABLE">Discoverable</option>
        </select>
      </label>
      <p className="text-xs leading-5 text-muted">
        Invitation-only and organization-code entry remain private regardless of this setting.
      </p>
      {state.error ? <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-danger">{state.error}</p> : null}
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button className="button" type="submit" disabled={pending}>
      {pending ? "Creating..." : "Create organization"}
    </button>
  );
}
