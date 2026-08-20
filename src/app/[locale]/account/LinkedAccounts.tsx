"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useDictionary, useLocale } from "@/lib/i18n/locale-context";
import { appPath } from "@/lib/organization-paths";

export function LinkedAccounts({ googleLinked }: { googleLinked: boolean }) {
  const router = useRouter();
  const locale = useLocale();
  const dictionary = useDictionary();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function linkGoogle() {
    setPending(true);
    setError(undefined);
    const result = await authClient.linkSocial({ provider: "google", callbackURL: appPath(locale, "/account") });

    if (result.error) {
      setError(dictionary.account.linkedAccountsPanel.linkError);
      setPending(false);
    }
  }

  async function unlinkGoogle() {
    setPending(true);
    setError(undefined);
    const result = await authClient.unlinkAccount({ providerId: "google" });

    if (result.error) {
      setError(dictionary.account.linkedAccountsPanel.unlinkError);
    } else {
      router.refresh();
    }

    setPending(false);
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-white p-4">
        <div>
          <p className="font-black">{dictionary.account.linkedAccountsPanel.google}</p>
          <p className="text-sm text-muted">
            {googleLinked ? dictionary.account.linkedAccountsPanel.linked : dictionary.account.linkedAccountsPanel.notLinked}
          </p>
        </div>
        <button
          className="button-secondary"
          type="button"
          onClick={googleLinked ? unlinkGoogle : linkGoogle}
          disabled={pending}
        >
          {pending
            ? dictionary.common.updating
            : googleLinked
              ? dictionary.account.linkedAccountsPanel.unlink
              : dictionary.account.linkedAccountsPanel.link}
        </button>
      </div>
      {error ? <p className="rounded-md bg-court-50 p-3 text-sm font-semibold text-court-700">{error}</p> : null}
    </div>
  );
}
