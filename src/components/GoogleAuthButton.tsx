"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function GoogleAuthButton({ callbackURL }: { callbackURL: string }) {
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function signIn() {
    setError(undefined);
    setPending(true);

    const result = await authClient.signIn.social({
      provider: "google",
      callbackURL,
      errorCallbackURL: "/login?error=google"
    });

    if (result.error) {
      setError("Google sign-in could not be started. Please try again.");
      setPending(false);
    }
  }

  return (
    <div className="grid gap-2">
      <button className="button-secondary w-full" type="button" onClick={signIn} disabled={pending}>
        {pending ? "Opening Google..." : "Continue with Google"}
      </button>
      {error ? <p className="text-sm font-semibold text-court-700">{error}</p> : null}
    </div>
  );
}
