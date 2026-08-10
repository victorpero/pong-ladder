import { EmptyState } from "@/components/EmptyState";
import { StatCard } from "@/components/StatCard";
import { formatWinRate, type HeadToHeadRecord, type PlayerRecord } from "@/lib/player-stats";

export function PlayerStats({
  seasonLabel,
  seasonRecord,
  allTimeRecord,
  headToHead,
  rival,
  emptyHeadToHeadBody
}: {
  seasonLabel: string;
  seasonRecord: PlayerRecord;
  allTimeRecord: PlayerRecord;
  headToHead: HeadToHeadRecord[];
  rival: HeadToHeadRecord | null;
  emptyHeadToHeadBody: string;
}) {
  return (
    <>
      <h2 className="text-xl font-black">Season {seasonLabel}</h2>
      <RecordCards record={seasonRecord} />

      <h2 className="mt-8 text-xl font-black">All time</h2>
      <RecordCards record={allTimeRecord} />

      {rival ? (
        <div className="mt-6 rounded-lg border border-court-500 bg-court-50 p-4">
          <p className="label">Rival</p>
          <p className="mt-1 text-xl font-black">{rival.opponentName}</p>
          <p className="mt-1 text-sm text-muted">
            Most played opponent · {rival.matchesPlayed} match{rival.matchesPlayed === 1 ? "" : "es"} · {rival.wins}-
            {rival.losses}
          </p>
        </div>
      ) : null}

      <h2 className="mt-8 text-xl font-black">Head to head</h2>
      <div className="mt-4">
        {headToHead.length === 0 ? (
          <EmptyState title="No opponents yet" body={emptyHeadToHeadBody} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className="stat-label pb-2">Opponent</th>
                  <th className="stat-label pb-2 text-right">Played</th>
                  <th className="stat-label pb-2 text-right">W</th>
                  <th className="stat-label pb-2 text-right">L</th>
                  <th className="stat-label pb-2 text-right">Win rate</th>
                </tr>
              </thead>
              <tbody>
                {headToHead.map((record) => (
                  <tr key={record.opponentId} className="border-b border-line last:border-0">
                    <td className="py-2 font-bold">
                      {record.opponentName}
                      {record.opponentId === rival?.opponentId ? (
                        <span className="ml-2 rounded-full bg-court-700 px-2 py-0.5 text-xs font-black text-white">
                          Rival
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2 text-right font-semibold">{record.matchesPlayed}</td>
                    <td className="py-2 text-right font-semibold">{record.wins}</td>
                    <td className="py-2 text-right font-semibold">{record.losses}</td>
                    <td className="py-2 text-right font-semibold">{formatWinRate(record.winRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function RecordCards({ record }: { record: PlayerRecord }) {
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-4">
      <StatCard label="Played" value={record.matchesPlayed} />
      <StatCard label="Wins" value={record.wins} />
      <StatCard label="Losses" value={record.losses} />
      <StatCard label="Win rate" value={formatWinRate(record.winRate)} />
    </div>
  );
}
