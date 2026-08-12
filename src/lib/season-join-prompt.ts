/**
 * Presentation rules for the current-season join prompt.
 *
 * Visibility is derived from the server-authoritative membership values only, so
 * the prompt disappears as soon as the join lands and the page revalidates. The
 * pending flag affects submission, never visibility: unmounting the form mid
 * request would tear down the action that is still in flight.
 */
export function shouldShowSeasonJoinPrompt({
  joined,
  hasActiveSeason
}: {
  joined: boolean;
  hasActiveSeason: boolean;
}) {
  return hasActiveSeason && !joined;
}

export function isSeasonJoinSubmitDisabled({
  joined,
  hasActiveSeason,
  pending
}: {
  joined: boolean;
  hasActiveSeason: boolean;
  pending: boolean;
}) {
  return !shouldShowSeasonJoinPrompt({ joined, hasActiveSeason }) || pending;
}
