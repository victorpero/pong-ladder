"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  redeemOrganizationInvitationAction,
  type RedeemInvitationState
} from "@/lib/organization-invitation-actions";
import { organizationsPath } from "@/lib/organization-paths";

export function InvitationRedemption({ token, organizationName }: { token: string; organizationName: string }) {
  const router = useRouter();
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
        router.replace(`${organizationsPath}?joined=${encodeURIComponent(redemption.organizationSlug)}`);
        return;
      }

      setResult(redemption);
    });
  }, [router, token]);

  if (!result) {
    return (
      <div className="mt-6 rounded-lg bg-court-50 p-4">
        <p className="font-black text-court-700">{pending ? "Accepting invitation..." : "Preparing invitation..."}</p>
        <p className="mt-1 text-sm text-muted">Your membership will be activated automatically.</p>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-lg bg-red-50 p-4 text-left">
      <p className="font-black text-danger">Invitation could not be accepted</p>
      <p className="mt-1 text-sm leading-6 text-muted">{redemptionMessage(result, organizationName)}</p>
    </div>
  );
}

function redemptionMessage(result: RedeemInvitationState, organizationName: string) {
  switch (result.outcome) {
    case "expired":
      return `This invitation to ${organizationName} has expired.`;
    case "revoked":
      return `This invitation to ${organizationName} was revoked.`;
    case "exhausted":
      return `This invitation to ${organizationName} has reached its use limit.`;
    case "verification_required":
      return "Verify your email before accepting this invitation.";
    case "pending":
      return `Your existing membership request for ${organizationName} is still pending.`;
    case "rejected":
      return `Your existing membership request for ${organizationName} was rejected.`;
    case "suspended":
      return `Your membership in ${organizationName} is suspended.`;
    case "removed":
      return `Your membership in ${organizationName} was removed.`;
    case "authentication_required":
      return "Log in before accepting this invitation.";
    case "rate_limited":
      return "Too many attempts. Wait a moment and try again.";
    default:
      return "This invitation is invalid or can no longer be used.";
  }
}
