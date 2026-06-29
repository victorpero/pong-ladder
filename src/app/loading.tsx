export default function Loading() {
  return (
    <main className="page-shell">
      <div className="section-band animate-pulse">
        <div className="h-6 w-40 rounded bg-stone-200" />
        <div className="mt-6 grid gap-3">
          <div className="h-20 rounded bg-stone-100" />
          <div className="h-20 rounded bg-stone-100" />
          <div className="h-20 rounded bg-stone-100" />
        </div>
      </div>
    </main>
  );
}

