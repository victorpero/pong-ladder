"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function LinkedAccounts({ googleLinked }: { googleLinked: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function linkGoogle() {
    setPending(true);
    setError(undefined);
    const result = await authClient.linkSocial({ provider: "google", callbackURL: "/account" });

    if (result.error) {
      setError("Google could not be linked. Use the same verified email as this account.");
      setPending(false);
    }
  }

  async function unlinkGoogle() {
    setPending(true);
    setError(undefined);
    const result = await authClient.unlinkAccount({ providerId: "google" });

    if (result.error) {
      setError("Google cannot be removed when it is your only sign-in method.");
    } else {
      router.refresh();
    }

    setPending(false);
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-white p-4">
        <div>
          <p className="font-black">Google</p>
          <p className="text-sm text-muted">{googleLinked ? "Linked" : "Not linked"}</p>
        </div>
        <button
          className="button-secondary"
          type="button"
          onClick={googleLinked ? unlinkGoogle : linkGoogle}
          disabled={pending}
        >
          {pending ? "Updating..." : googleLinked ? "Unlink" : "Link Google"}
        </button>
      </div>
      {error ? <p className="rounded-md bg-court-50 p-3 text-sm font-semibold text-court-700">{error}</p> : null}
    </div>
  );
}
