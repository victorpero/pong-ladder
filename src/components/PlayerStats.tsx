import { EmptyState } from "@/components/EmptyState";
import { StatCard } from "@/components/StatCard";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";
import { plural, t } from "@/lib/i18n/format";
import { formatWinRate, type HeadToHeadRecord, type PlayerRecord } from "@/lib/player-stats";

export function PlayerStats({
  locale,
  seasonLabel,
  seasonRecord,
  allTimeRecord,
  headToHead,
  rival,
  emptyHeadToHeadBody
}: {
  locale: Locale;
  seasonLabel: string;
  seasonRecord: PlayerRecord;
  allTimeRecord: PlayerRecord;
  headToHead: HeadToHeadRecord[];
  rival: HeadToHeadRecord | null;
  emptyHeadToHeadBody: string;
}) {
  const dictionary = getDictionary(locale);

  return (
    <>
      <h2 className="text-xl font-black">{t(dictionary.playerStats.seasonHeading, { season: seasonLabel })}</h2>
      <RecordCards record={seasonRecord} locale={locale} />

      <h2 className="mt-8 text-xl font-black">{dictionary.playerStats.allTimeHeading}</h2>
      <RecordCards record={allTimeRecord} locale={locale} />

      {rival ? (
        <div className="mt-6 rounded-lg border border-court-500 bg-court-50 p-4">
          <p className="label">{dictionary.playerStats.rivalLabel}</p>
          <p className="mt-1 text-xl font-black">{rival.opponentName}</p>
          <p className="mt-1 text-sm text-muted">
            {plural(rival.matchesPlayed, dictionary.playerStats.rivalDetail, {
              wins: rival.wins,
              losses: rival.losses
            })}
          </p>
        </div>
      ) : null}

      <h2 className="mt-8 text-xl font-black">{dictionary.playerStats.headToHeadHeading}</h2>
      <div className="mt-4">
        {headToHead.length === 0 ? (
          <EmptyState title={dictionary.playerStats.noOpponentsTitle} body={emptyHeadToHeadBody} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className="stat-label pb-2">{dictionary.playerStats.opponent}</th>
                  <th className="stat-label pb-2 text-right">{dictionary.playerStats.played}</th>
                  <th className="stat-label pb-2 text-right">{dictionary.playerStats.winsShort}</th>
                  <th className="stat-label pb-2 text-right">{dictionary.playerStats.lossesShort}</th>
                  <th className="stat-label pb-2 text-right">{dictionary.playerStats.winRate}</th>
                </tr>
              </thead>
              <tbody>
                {headToHead.map((record) => (
                  <tr key={record.opponentId} className="border-b border-line last:border-0">
                    <td className="py-2 font-bold">
                      {record.opponentName}
                      {record.opponentId === rival?.opponentId ? (
                        <span className="ml-2 rounded-full bg-court-700 px-2 py-0.5 text-xs font-black text-white">
                          {dictionary.playerStats.rivalBadge}
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2 text-right font-semibold">{record.matchesPlayed}</td>
                    <td className="py-2 text-right font-semibold">{record.wins}</td>
                    <td className="py-2 text-right font-semibold">{record.losses}</td>
                    <td className="py-2 text-right font-semibold">{formatWinRate(record.winRate, locale)}</td>
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

function RecordCards({ record, locale }: { record: PlayerRecord; locale: Locale }) {
  const dictionary = getDictionary(locale);

  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-4">
      <StatCard label={dictionary.common.played} value={record.matchesPlayed} />
      <StatCard label={dictionary.common.wins} value={record.wins} />
      <StatCard label={dictionary.common.losses} value={record.losses} />
      <StatCard label={dictionary.playerStats.winRate} value={formatWinRate(record.winRate, locale)} />
    </div>
  );
}
