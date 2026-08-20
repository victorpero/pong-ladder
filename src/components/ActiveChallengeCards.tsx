"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { submitMatchResult, type MatchResultFormState } from "@/lib/actions";
import { resolveMatchParticipants } from "@/lib/active-challenges";
import { t } from "@/lib/i18n/format";
import { useDictionary } from "@/lib/i18n/locale-context";

const initialResultState: MatchResultFormState = {};

export type ActiveChallengeCard = {
  id: string;
  opponentId: string;
  opponentName: string;
  opponentDetail: string | null;
  acceptedLabel: string;
};

export function ActiveChallengeCards({
  organizationSlug,
  seasonId,
  viewerId,
  challenges,
  defaultPlayedAt
}: {
  organizationSlug: string;
  seasonId: string;
  viewerId: string;
  challenges: ActiveChallengeCard[];
  defaultPlayedAt: string;
}) {
  const dictionary = useDictionary();

  // No accepted challenge means no section at all, so the ladder stays at the top.
  if (challenges.length === 0) {
    return null;
  }

  return (
    <section className="section-band mb-6" aria-labelledby="active-challenges-heading">
      <p className="label">{dictionary.activeChallenges.label}</p>
      <h2 className="mt-1 text-2xl font-black" id="active-challenges-heading">
        {dictionary.activeChallenges.heading}
      </h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {challenges.map((challenge) => (
          <li key={challenge.id}>
            <ActiveChallengeEntry
              challenge={challenge}
              defaultPlayedAt={defaultPlayedAt}
              organizationSlug={organizationSlug}
              seasonId={seasonId}
              viewerId={viewerId}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ActiveChallengeEntry({
  challenge,
  organizationSlug,
  seasonId,
  viewerId,
  defaultPlayedAt
}: {
  challenge: ActiveChallengeCard;
  organizationSlug: string;
  seasonId: string;
  viewerId: string;
  defaultPlayedAt: string;
}) {
  const dictionary = useDictionary();
  const router = useRouter();
  const [resultState, saveResult] = useFormState(submitMatchResult, initialResultState);
  const [entryOpen, setEntryOpen] = useState(false);
  const [winner, setWinner] = useState<"viewer" | "opponent">("viewer");
  const formId = useId();
  // Shared radio name so the two choices behave as one keyboard-navigable group.
  const winnerGroup = `winner-${challenge.id}`;
  const { winnerId, loserId } = resolveMatchParticipants({ viewerId, opponentId: challenge.opponentId, winner });
  // Someone else closed the challenge: keep the card visible long enough to say
  // so, but with the dead result entry disabled.
  const stale = Boolean(resultState.stale);

  return (
    <article
      className={`flex h-full flex-col rounded-lg border p-4 ${
        stale ? "border-line bg-slate-50" : "border-court-500 bg-court-50"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="break-words text-lg font-black">{challenge.opponentName}</p>
          <p className="text-sm text-muted">
            {challenge.acceptedLabel}
            {challenge.opponentDetail ? ` · ${challenge.opponentDetail}` : ""}
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-neutral">
          {stale ? dictionary.activeChallenges.staleBadge : dictionary.challenges.status.Accepted}
        </span>
      </div>

      {stale ? (
        <button className="button mt-3 w-full" onClick={() => router.refresh()} type="button">
          {dictionary.activeChallenges.refreshLadder}
        </button>
      ) : (
        <button
          aria-controls={formId}
          aria-expanded={entryOpen}
          className={`${entryOpen ? "button-secondary" : "button"} mt-3 w-full`}
          onClick={() => setEntryOpen((open) => !open)}
          type="button"
        >
          {entryOpen ? dictionary.activeChallenges.closeResult : dictionary.activeChallenges.enterResult}
        </button>
      )}

      {entryOpen ? (
        <form action={saveResult} className="mt-3 grid gap-3" id={formId}>
          <input name="organizationSlug" type="hidden" value={organizationSlug} />
          <input name="seasonId" type="hidden" value={seasonId} />
          <input name="challengeId" type="hidden" value={challenge.id} />
          <input name="winnerId" type="hidden" value={winnerId} />
          <input name="loserId" type="hidden" value={loserId} />

          <fieldset className="grid gap-2" disabled={stale}>
            <legend className="label">{dictionary.matches.winnerLabel}</legend>
            <WinnerChoice
              checked={winner === "viewer"}
              group={winnerGroup}
              label={dictionary.activeChallenges.viewerWon}
              onSelect={() => setWinner("viewer")}
              value="viewer"
            />
            <WinnerChoice
              checked={winner === "opponent"}
              group={winnerGroup}
              label={t(dictionary.activeChallenges.opponentWon, { opponent: challenge.opponentName })}
              onSelect={() => setWinner("opponent")}
              value="opponent"
            />
          </fieldset>

          <label className="grid gap-1">
            <span className="label">{dictionary.matches.resultLabel}</span>
            <select className="field" defaultValue="0" disabled={stale} name="loserSets" required>
              <option value="0">3-0</option>
              <option value="1">3-1</option>
              <option value="2">3-2</option>
            </select>
          </label>

          <label className="grid gap-1">
            <span className="label">{dictionary.matches.dateLabel}</span>
            <input className="field" defaultValue={defaultPlayedAt} disabled={stale} name="playedAt" type="date" />
          </label>

          {resultState.error ? (
            <p className="rounded-md bg-court-50 p-3 text-sm font-semibold text-court-700" role="alert">
              {resultState.error}
            </p>
          ) : null}

          <SaveResultButton disabled={stale} />
        </form>
      ) : null}
    </article>
  );
}

function WinnerChoice({
  checked,
  group,
  label,
  onSelect,
  value
}: {
  checked: boolean;
  group: string;
  label: string;
  onSelect: () => void;
  value: "viewer" | "opponent";
}) {
  return (
    <label
      className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition ${
        checked ? "border-court-500 bg-white" : "border-line bg-white/60"
      }`}
    >
      <input
        checked={checked}
        className="h-4 w-4 accent-court-500"
        name={group}
        onChange={onSelect}
        type="radio"
        value={value}
      />
      <span className="break-words">{label}</span>
    </label>
  );
}

function SaveResultButton({ disabled }: { disabled: boolean }) {
  // Blocks the obvious double submit; the server still rejects a challenge that
  // another participant reported in the meantime.
  const dictionary = useDictionary();
  const { pending } = useFormStatus();

  return (
    <button className="button" disabled={disabled || pending} type="submit">
      {pending ? dictionary.activeChallenges.savingResult : dictionary.matches.saveResult}
    </button>
  );
}
