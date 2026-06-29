"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";
import { joinCurrentSeason } from "@/lib/actions";

export function JoinSeasonToggle({
  joined,
  hasActiveSeason
}: {
  joined: boolean;
  hasActiveSeason: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form action={joinCurrentSeason} ref={formRef} className="rounded-lg border border-line bg-white p-4">
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
  const { pending } = useFormStatus();
  const disabled = joined || !hasActiveSeason || pending;

  return (
    <label className="flex items-start gap-3">
      <input
        className="mt-1 h-4 w-4 rounded border-line text-court-700"
        type="checkbox"
        name="joinCurrentSeason"
        defaultChecked={joined}
        disabled={disabled}
        onChange={(event) => {
          if (event.currentTarget.checked) {
            formRef.current?.requestSubmit();
          }
        }}
      />
      <span>
        <span className="block text-sm font-black">Joined current season</span>
        <span className="mt-1 block text-xs leading-5 text-muted">
          {joined
            ? "You are visible on the ladder and available in match and challenge player lists."
            : "Check this to join the active season and become available for matches and challenges."}
        </span>
      </span>
      <button className="sr-only" type="submit" disabled={disabled}>
        Join current season
      </button>
    </label>
  );
}

