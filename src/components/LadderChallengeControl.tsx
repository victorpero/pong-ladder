"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { acceptChallengeFromLadder, challengeFromLadder, type ChallengeFormState } from "@/lib/actions";
import type { LadderChallengeState } from "@/lib/ladder-challenge-state";

const initialState: ChallengeFormState = {};

/**
 * The challenge control for one ladder row.
 *
 * Which control appears is decided on the server from the authoritative
 * challenge relationship, so this component only renders the state it is given
 * and reports back what the mutation returned.
 */
export function LadderChallengeControl({
  state,
  organizationSlug,
  seasonId,
  opponentId,
  opponentName,
  matchesPath
}: {
  state: LadderChallengeState;
  organizationSlug: string;
  seasonId: string;
  opponentId: string;
  opponentName: string;
  matchesPath: string;
}) {
  switch (state.kind) {
    case "available":
      return (
        <ChallengeForm
          organizationSlug={organizationSlug}
          seasonId={seasonId}
          opponentId={opponentId}
          opponentName={opponentName}
        />
      );

    case "incoming":
      return (
        <AcceptForm organizationSlug={organizationSlug} challengeId={state.challengeId} opponentName={opponentName} />
      );

    case "outgoing":
      return (
        <span className="ladder-action bg-amber-50 text-warning">
          Pending
          <span className="sr-only"> — waiting for {opponentName} to respond</span>
        </span>
      );

    case "active":
      return (
        <Link
          className="ladder-action bg-court-500 text-white hover:bg-court-700"
          href={`${matchesPath}?challengeId=${state.challengeId}`}
          aria-label={`Register the match against ${opponentName}`}
        >
          Active
        </Link>
      );

    // A row the viewer cannot act on carries no control, which keeps the ladder
    // readable on a phone instead of lining it with disabled buttons.
    default:
      return null;
  }
}

function ChallengeForm({
  organizationSlug,
  seasonId,
  opponentId,
  opponentName
}: {
  organizationSlug: string;
  seasonId: string;
  opponentId: string;
  opponentName: string;
}) {
  const [state, action] = useFormState(challengeFromLadder, initialState);

  return (
    <form action={action} className="relative">
      <input type="hidden" name="organizationSlug" value={organizationSlug} />
      <input type="hidden" name="seasonId" value={seasonId} />
      <input type="hidden" name="challengedId" value={opponentId} />
      <ActionButton
        className="bg-court-500 text-white hover:bg-court-700"
        label="Challenge"
        pendingLabel="Sending"
        ariaLabel={`Challenge ${opponentName}`}
      />
      <ActionError message={state.error} />
    </form>
  );
}

function AcceptForm({
  organizationSlug,
  challengeId,
  opponentName
}: {
  organizationSlug: string;
  challengeId: string;
  opponentName: string;
}) {
  const [state, action] = useFormState(acceptChallengeFromLadder, initialState);

  return (
    <form action={action} className="relative">
      <input type="hidden" name="organizationSlug" value={organizationSlug} />
      <input type="hidden" name="challengeId" value={challengeId} />
      <ActionButton
        className="bg-ink text-white hover:bg-neutral"
        label="Accept"
        pendingLabel="Accepting"
        ariaLabel={`Accept the challenge from ${opponentName}`}
      />
      <ActionError message={state.error} />
    </form>
  );
}

/**
 * Disabled for the whole round trip, so repeated taps cannot open a second
 * challenge while the first one is still being written.
 */
function ActionButton({
  className,
  label,
  pendingLabel,
  ariaLabel
}: {
  className: string;
  label: string;
  pendingLabel: string;
  ariaLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button className={`ladder-action ${className}`} type="submit" disabled={pending} aria-label={ariaLabel} aria-busy={pending}>
      {pending ? `${pendingLabel}...` : label}
    </button>
  );
}

/** Floats over the row so a rejected action never changes the ladder layout. */
function ActionError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <p
      role="status"
      className="absolute right-0 top-full z-20 mt-1 w-52 rounded-md border border-court-200 bg-white p-2 text-xs font-semibold leading-4 text-court-700 shadow-soft"
    >
      {message}
    </p>
  );
}
