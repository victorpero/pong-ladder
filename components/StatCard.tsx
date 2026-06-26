export function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <p className="stat-label">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  );
}

