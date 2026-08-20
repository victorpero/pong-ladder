"use client";

import { Building2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  prepareOrganizationCodeInvitation,
  type PrepareOrganizationCodeInvitationState
} from "@/lib/organization-code-invitation-actions";
import { t } from "@/lib/i18n/format";
import { useDictionary, useLocale } from "@/lib/i18n/locale-context";
import { joinOrganizationWithAccessCode, type OrganizationJoinState } from "@/lib/organization-join-actions";
import { appPath, loginPath, organizationsPath } from "@/lib/organization-paths";

const storedCodeKey = "pong-ladder:organization-invitation-code";
const joinRoute = "/join/code";
type DeferredPreparation = Exclude<PrepareOrganizationCodeInvitationState, { outcome: "ready" }>;

type FlowState =
  | { phase: "preparing" }
  | { phase: "prepared"; preparation: DeferredPreparation }
  | { phase: "failed"; result: OrganizationJoinState; organizationName: string };

export function OrganizationCodeRedemption() {
  const router = useRouter();
  const locale = useLocale();
  const dictionary = useDictionary();
  const joinPath = appPath(locale, joinRoute);
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
        router.replace(`${organizationsPath(locale)}?joined=${encodeURIComponent(redemption.organizationSlug)}`);
        return;
      }

      setState({ phase: "failed", result: redemption, organizationName: preparation.organizationName });
    });
  }, [joinPath, locale, router]);

  if (state.phase === "preparing") {
    return (
      <div className="rounded-lg bg-court-50 p-4">
        <p className="font-black text-court-700">
          {pending ? dictionary.invitation.preparing : dictionary.invitation.opening}
        </p>
        <p className="mt-1 text-sm text-muted">{dictionary.invitation.automaticActivation}</p>
      </div>
    );
  }

  if (state.phase === "prepared") {
    return <PreparedInvitation preparation={state.preparation} joinPath={joinPath} />;
  }

  return (
    <div>
      <InvitationHeading organizationName={state.organizationName} />
      <div className="mt-6 rounded-lg bg-red-50 p-4 text-left">
      <p className="font-black text-danger">{dictionary.invitation.failedTitle}</p>
        <p className="mt-1 text-sm leading-6 text-muted">
          {state.result.message ?? dictionary.invitation.codeUnavailable}
        </p>
      </div>
    </div>
  );
}

function PreparedInvitation({
  preparation,
  joinPath
}: {
  preparation: DeferredPreparation;
  joinPath: string;
}) {
  const locale = useLocale();
  const dictionary = useDictionary();

  if (preparation.outcome === "invalid") {
    return (
      <div>
        <p className="label">{dictionary.invitation.label}</p>
        <h1 className="mt-2 text-3xl font-black">{dictionary.invitation.codeInvalidHeading}</h1>
        <p className="mt-3 text-sm leading-6 text-muted">{dictionary.invitation.codeInvalidBody}</p>
        <Link className="button-secondary mt-6 inline-flex" href={organizationsPath(locale)}>
          {dictionary.common.backToOrganizations}
        </Link>
      </div>
    );
  }

  return (
    <div>
      <InvitationHeading organizationName={preparation.organizationName} />
      {preparation.outcome === "authentication_required" ? (
        <>
          <p className="mt-5 text-sm leading-6 text-muted">{dictionary.invitation.codeLoginPrompt}</p>
          <Link className="button mt-6 inline-flex" href={loginPath(locale, joinPath)}>
            {dictionary.invitation.continueToLogin}
          </Link>
        </>
      ) : (
        <>
          <p className="mt-5 text-sm leading-6 text-muted">
            {t(dictionary.invitation.codeVerifyPrompt, { email: preparation.email })}
          </p>
          <Link
            className="button mt-6 inline-flex"
            href={`${appPath(locale, "/verify-email")}?next=${encodeURIComponent(joinPath)}`}
          >
            {dictionary.invitation.verifyEmail}
          </Link>
        </>
      )}
    </div>
  );
}

function InvitationHeading({ organizationName }: { organizationName: string }) {
  const dictionary = useDictionary();

  return (
    <>
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-court-50 text-court-700">
        <Building2 aria-hidden="true" size={24} />
      </span>
      <p className="label mt-5">{dictionary.invitation.label}</p>
      <h1 className="mt-2 text-3xl font-black">
        {t(dictionary.invitation.joinHeading, { organization: organizationName })}
      </h1>
      <p className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-muted">
        <ShieldCheck aria-hidden="true" size={17} /> {dictionary.invitation.verifiedNote}
      </p>
    </>
  );
}
