"use client";

import { useEffect } from "react";
import { lastSeenReleaseStorageKey } from "@/lib/version";

/**
 * Viewing the changelog is the acknowledgement, so the footer indicator clears
 * itself without a release popup ever interrupting anyone.
 */
export function ReleaseAcknowledgement({ version }: { version: string }) {
  useEffect(() => {
    try {
      window.localStorage.setItem(lastSeenReleaseStorageKey, version);
      window.dispatchEvent(new CustomEvent(releaseAcknowledgedEvent, { detail: version }));
    } catch {
      // Private browsing modes can refuse storage. The indicator is cosmetic.
    }
  }, [version]);

  return null;
}

export const releaseAcknowledgedEvent = "pong-ladder:release-acknowledged";
