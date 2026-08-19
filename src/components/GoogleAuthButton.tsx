"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useLocale, useDictionary } from "@/lib/i18n/locale-context";
import { appPath } from "@/lib/organization-paths";

export function GoogleAuthButton({ callbackURL }: { callbackURL: string }) {
  const locale = useLocale();
  const dictionary = useDictionary();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function signIn() {
    setError(undefined);
    setPending(true);

    const result = await authClient.signIn.social({
      provider: "google",
      callbackURL,
      errorCallbackURL: `${appPath(locale, "/login")}?error=google`
    });

    if (result.error) {
      setError(dictionary.login.googleStartError);
      setPending(false);
    }
  }

  return (
    <div className="grid gap-2">
      <button className="button-secondary w-full" type="button" onClick={signIn} disabled={pending}>
        {pending ? dictionary.login.googleOpening : dictionary.login.googleButton}
      </button>
      {error ? <p className="text-sm font-semibold text-court-700">{error}</p> : null}
    </div>
  );
}
