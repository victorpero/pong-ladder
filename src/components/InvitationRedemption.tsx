"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { t } from "@/lib/i18n/format";
import { useDictionary, useLocale } from "@/lib/i18n/locale-context";
import {
  redeemOrganizationInvitationAction,
  type RedeemInvitationState
} from "@/lib/organization-invitation-actions";
import { organizationsPath } from "@/lib/organization-paths";
import type { Dictionary } from "@/lib/i18n/dictionary";

export function InvitationRedemption({ token, organizationName }: { token: string; organizationName: string }) {
  const router = useRouter();
  const locale = useLocale();
  const dictionary = useDictionary();
  const started = useRef(false);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<RedeemInvitationState | null>(null);

  useEffect(() => {
    if (started.current) {
      return;
    }

    started.current = true;
    startTransition(async () => {
      const redemption = await redeemOrganizationInvitationAction(token);

      if (redemption.outcome === "redeemed" || redemption.outcome === "already_member") {
        router.replace(`${organizationsPath(locale)}?joined=${encodeURIComponent(redemption.organizationSlug)}`);
        return;
      }

      setResult(redemption);
    });
  }, [locale, router, token]);

  if (!result) {
    return (
      <div className="mt-6 rounded-lg bg-court-50 p-4">
        <p className="font-black text-court-700">
          {pending ? dictionary.invitation.accepting : dictionary.invitation.preparing}
        </p>
        <p className="mt-1 text-sm text-muted">{dictionary.invitation.automaticActivation}</p>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-lg bg-red-50 p-4 text-left">
      <p className="font-black text-danger">{dictionary.invitation.failedTitle}</p>
      <p className="mt-1 text-sm leading-6 text-muted">
        {redemptionMessage(dictionary, result, organizationName)}
      </p>
    </div>
  );
}

function redemptionMessage(dictionary: Dictionary, result: RedeemInvitationState, organizationName: string) {
  const messages = dictionary.actions.invitationRedemption;
  const organization = { organization: organizationName };

  switch (result.outcome) {
    case "expired":
      return t(messages.expired, organization);
    case "revoked":
      return t(messages.revoked, organization);
    case "exhausted":
      return t(messages.exhausted, organization);
    case "verification_required":
      return messages.verificationRequired;
    case "pending":
      return t(messages.pending, organization);
    case "rejected":
      return t(messages.rejected, organization);
    case "suspended":
      return t(messages.suspended, organization);
    case "removed":
      return t(messages.removed, organization);
    case "authentication_required":
      return messages.authenticationRequired;
    case "rate_limited":
      return messages.rateLimited;
    default:
      return messages.invalid;
  }
}
