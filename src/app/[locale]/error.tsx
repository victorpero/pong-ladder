"use client";

import { useDictionary } from "@/lib/i18n/locale-context";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  const dictionary = useDictionary();

  return (
    <main className="page-shell">
      <div className="section-band">
        <p className="text-sm font-semibold text-court-700">{dictionary.errorBoundary.label}</p>
        <h1 className="mt-2 text-2xl font-bold">{dictionary.errorBoundary.heading}</h1>
        <p className="mt-3 max-w-2xl text-sm text-muted">{dictionary.errorBoundary.body}</p>
        <button className="button mt-6" onClick={reset}>
          {dictionary.common.tryAgain}
        </button>
      </div>
    </main>
  );
}
