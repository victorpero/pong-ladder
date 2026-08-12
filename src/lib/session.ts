export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type SessionPayload = {
  sub: string;
  username: string;
  email: string;
  iat: number;
  exp: number;
};
