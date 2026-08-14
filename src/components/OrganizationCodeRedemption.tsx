"use client";

import { Building2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  prepareOrganizationCodeInvitation,
  type PrepareOrganizationCodeInvitationState
} from "@/lib/organization-code-invitation-actions";
import { joinOrganizationWithAccessCode, type OrganizationJoinState } from "@/lib/organization-join-actions";
import { organizationsPath } from "@/lib/organization-paths";

const storedCodeKey = "pong-ladder:organization-invitation-code";
const joinPath = "/join/code";
type DeferredPreparation = Exclude<PrepareOrganizationCodeInvitationState, { outcome: "ready" }>;

type FlowState =
  | { phase: "preparing" }
  | { phase: "prepared"; preparation: DeferredPreparation }
  | { phase: "failed"; result: OrganizationJoinState; organizationName: string };

export function OrganizationCodeRedemption() {
  const router = useRouter();
  const started = useRef(false);
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<FlowState>({ phase: "preparing" });

  useEffect(() => {
    if (started.current) {
      return;
    }

    started.current = true;
    startTransition(async () => {
      const fragmentCode = new URLSearchParams(window.location.hash.slice(1)).get("code");
      const accessCode = fragmentCode ?? window.sessionStorage.getItem(storedCodeKey);

      if (fragmentCode) {
        window.sessionStorage.setItem(storedCodeKey, fragmentCode);
        window.history.replaceState(null, "", joinPath);
      }

      if (!accessCode) {
        setState({ phase: "prepared", preparation: { outcome: "invalid" } });
        return;
      }

      const preparation = await prepareOrganizationCodeInvitation(accessCode);

      if (preparation.outcome !== "ready") {
        if (preparation.outcome === "invalid") {
          window.sessionStorage.removeItem(storedCodeKey);
        }
        setState({ phase: "prepared", preparation });
        return;
      }

      const formData = new FormData();
      formData.set("accessCode", accessCode);
      const redemption = await joinOrganizationWithAccessCode({}, formData);

      if (
        (redemption.outcome === "active" || redemption.outcome === "already_member") &&
        redemption.organizationSlug
      ) {
        window.sessionStorage.removeItem(storedCodeKey);
        router.replace(`${organizationsPath}?joined=${encodeURIComponent(redemption.organizationSlug)}`);
        return;
      }

      setState({ phase: "failed", result: redemption, organizationName: preparation.organizationName });
    });
  }, [router]);

  if (state.phase === "preparing") {
    return (
      <div className="rounded-lg bg-court-50 p-4">
        <p className="font-black text-court-700">{pending ? "Preparing invitation..." : "Opening invitation..."}</p>
        <p className="mt-1 text-sm text-muted">Your membership will be activated automatically.</p>
      </div>
    );
  }

  if (state.phase === "prepared") {
    return <PreparedInvitation preparation={state.preparation} />;
  }

  return (
    <div>
      <InvitationHeading organizationName={state.organizationName} />
      <div className="mt-6 rounded-lg bg-red-50 p-4 text-left">
      <p className="font-black text-danger">Invitation could not be accepted</p>
        <p className="mt-1 text-sm leading-6 text-muted">
          {state.result.message ?? "This invitation is unavailable."}
        </p>
      </div>
    </div>
  );
}

function PreparedInvitation({ preparation }: { preparation: DeferredPreparation }) {
  if (preparation.outcome === "invalid") {
    return (
      <div>
        <p className="label">Organization invitation</p>
        <h1 className="mt-2 text-3xl font-black">Invitation unavailable</h1>
        <p className="mt-3 text-sm leading-6 text-muted">This organization invitation is invalid.</p>
        <Link className="button-secondary mt-6 inline-flex" href={organizationsPath}>
          Back to organizations
        </Link>
      </div>
    );
  }

  return (
    <div>
      <InvitationHeading organizationName={preparation.organizationName} />
      {preparation.outcome === "authentication_required" ? (
        <>
          <p className="mt-5 text-sm leading-6 text-muted">
            Log in or create an account to join this organization. The invitation remains active through authentication.
          </p>
          <Link className="button mt-6 inline-flex" href={`/login?next=${encodeURIComponent(joinPath)}`}>
            Continue to login
          </Link>
        </>
      ) : (
        <>
          <p className="mt-5 text-sm leading-6 text-muted">
            Verify {preparation.email} before joining this organization.
          </p>
          <Link className="button mt-6 inline-flex" href={`/verify-email?next=${encodeURIComponent(joinPath)}`}>
            Verify email
          </Link>
        </>
      )}
    </div>
  );
}

function InvitationHeading({ organizationName }: { organizationName: string }) {
  return (
    <>
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-court-50 text-court-700">
        <Building2 aria-hidden="true" size={24} />
      </span>
      <p className="label mt-5">Organization invitation</p>
      <h1 className="mt-2 text-3xl font-black">Join {organizationName}</h1>
      <p className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-muted">
        <ShieldCheck aria-hidden="true" size={17} /> Verified accounts receive active membership
      </p>
    </>
  );
}
