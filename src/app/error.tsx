"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="page-shell">
      <div className="section-band">
        <p className="text-sm font-semibold text-court-700">Something went wrong.</p>
        <h1 className="mt-2 text-2xl font-bold">The rally clipped the net.</h1>
        <p className="mt-3 max-w-2xl text-sm text-muted">{error.message}</p>
        <button className="button mt-6" onClick={reset}>
          Try again
        </button>
      </div>
    </main>
  );
}

