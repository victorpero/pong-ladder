/**
 * An error whose message is written for the player and is safe to show them.
 *
 * Server actions that hand failures back to the browser return the message of a
 * user-facing error and a generic fallback for anything else, so database,
 * driver and runtime errors never carry implementation detail to the client.
 */
export class UserFacingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserFacingError";
  }
}

export function isUserFacingError(error: unknown): error is UserFacingError {
  return error instanceof UserFacingError;
}
