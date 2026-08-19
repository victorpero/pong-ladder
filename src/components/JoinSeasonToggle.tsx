"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";
import { joinCurrentSeason } from "@/lib/actions";
import { useDictionary } from "@/lib/i18n/locale-context";
import { isSeasonJoinSubmitDisabled, shouldShowSeasonJoinPrompt } from "@/lib/season-join-prompt";

export function JoinSeasonToggle({
  joined,
  hasActiveSeason,
  organizationSlug
}: {
  joined: boolean;
  hasActiveSeason: boolean;
  organizationSlug: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  if (!shouldShowSeasonJoinPrompt({ joined, hasActiveSeason })) {
    return null;
  }

  return (
    <form action={joinCurrentSeason} ref={formRef} className="rounded-lg border border-court-500 bg-court-50 p-4">
      <input type="hidden" name="organizationSlug" value={organizationSlug} />
      <JoinSeasonCheckbox joined={joined} hasActiveSeason={hasActiveSeason} formRef={formRef} />
    </form>
  );
}

function JoinSeasonCheckbox({
  joined,
  hasActiveSeason,
  formRef
}: {
  joined: boolean;
  hasActiveSeason: boolean;
  formRef: React.RefObject<HTMLFormElement>;
}) {
  const dictionary = useDictionary();
  const { pending } = useFormStatus();
  const disabled = isSeasonJoinSubmitDisabled({ joined, hasActiveSeason, pending });

  return (
    <label className="flex items-start gap-3" aria-busy={pending}>
      <input
        className="mt-1 h-4 w-4 rounded border-court-500 text-court-700 outline-none transition focus:ring-2 focus:ring-court-500 focus:ring-offset-1 disabled:cursor-not-allowed"
        type="checkbox"
        name="joinCurrentSeason"
        disabled={disabled}
        onChange={(event) => {
          if (event.currentTarget.checked) {
            formRef.current?.requestSubmit();
          }
        }}
      />
      <span>
        <span className="block text-sm font-black">{dictionary.seasonJoin.heading}</span>
        <span className="mt-1 block text-xs leading-5 text-muted">
          {pending ? dictionary.seasonJoin.joining : dictionary.seasonJoin.help}
        </span>
      </span>
      <button className="sr-only" type="submit" disabled={disabled}>
        {dictionary.seasonJoin.heading}
      </button>
    </label>
  );
}
