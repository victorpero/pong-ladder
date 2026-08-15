import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

type TokenRow = {
  id: string;
  userId: string;
  email: string;
  tokenHash: string;
  expiresAt: Date;
  consumedAt: Date | null;
};

type UserRow = {
  id: string;
  email: string;
  emailVerifiedAt: Date | null;
  passwordChangedAt: Date | null;
};

type AccountRow = { id: string; userId: string; providerId: string; password: string | null };

type SessionRow = { id: string; userId: string };

const state = vi.hoisted(() => ({
  users: [] as UserRow[],
  accounts: [] as AccountRow[],
  tokens: [] as TokenRow[],
  sessions: [] as SessionRow[]
}));

const mail = vi.hoisted(() => ({
  reset: [] as { to: string; resetUrl: string; expiresInMinutes: number }[],
  google: [] as { to: string; loginUrl: string }[],
  verification: [] as { userId: string; email: string }[],
  failDelivery: false
}));

vi.mock("@/lib/email", () => ({
  sendPasswordResetEmail: async (message: { to: string; resetUrl: string; expiresInMinutes: number }) => {
    if (mail.failDelivery) {
      throw new Error("SMTP unavailable");
    }

    mail.reset.push(message);
  },
  sendGoogleSignInNoticeEmail: async (message: { to: string; loginUrl: string }) => {
    mail.google.push(message);
  }
}));

vi.mock("@/lib/email-verification", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/email-verification")>();

  return {
    normalizeEmail: actual.normalizeEmail,
    issueEmailVerification: async (userId: string, email: string) => {
      mail.verification.push({ userId, email });
    }
  };
});

vi.mock("@/lib/prisma", () => {
  const passwordResetToken = {
    findUnique: async ({ where }: { where: { tokenHash: string } }) =>
      state.tokens.find((token) => token.tokenHash === where.tokenHash) ?? null,
    create: async ({ data }: { data: Omit<TokenRow, "id" | "consumedAt"> }) => {
      const created: TokenRow = { id: `token-${state.tokens.length + 1}`, consumedAt: null, ...data };
      state.tokens.push(created);
      return created;
    },
    deleteMany: async ({ where }: { where: { userId: string; id?: { not: string } } }) => {
      const remaining = state.tokens.filter(
        (token) => token.userId !== where.userId || token.id === where.id?.not
      );
      const count = state.tokens.length - remaining.length;
      state.tokens = remaining;
      return { count };
    },
    updateMany: async ({
      where,
      data
    }: {
      where: { id: string; consumedAt: null; expiresAt: { gt: Date } };
      data: { consumedAt: Date };
    }) => {
      const matches = state.tokens.filter(
        (token) =>
          token.id === where.id && token.consumedAt === null && token.expiresAt > where.expiresAt.gt
      );
      matches.forEach((token) => Object.assign(token, data));
      return { count: matches.length };
    }
  };

  const user = {
    findFirst: async ({ where }: { where: { email: { equals: string } } }) => {
      const row = state.users.find(
        (candidate) => candidate.email.toLowerCase() === where.email.equals.toLowerCase()
      );

      return row
        ? {
            ...row,
            authAccounts: state.accounts.filter((account) => account.userId === row.id)
          }
        : null;
    },
    findUnique: async ({ where }: { where: { id: string } }) =>
      state.users.find((row) => row.id === where.id) ?? null,
    update: async ({ where, data }: { where: { id: string }; data: Partial<UserRow> }) => {
      const row = state.users.find((candidate) => candidate.id === where.id)!;
      Object.assign(row, data);
      return row;
    }
  };

  const account = {
    findFirst: async ({ where }: { where: { userId: string; providerId: string } }) =>
      state.accounts.find(
        (row) => row.userId === where.userId && row.providerId === where.providerId
      ) ?? null,
    update: async ({ where, data }: { where: { id: string }; data: Partial<AccountRow> }) => {
      const row = state.accounts.find((candidate) => candidate.id === where.id)!;
      Object.assign(row, data);
      return row;
    }
  };

  const session = {
    deleteMany: async ({ where }: { where: { userId: string } }) => {
      const remaining = state.sessions.filter((row) => row.userId !== where.userId);
      const count = state.sessions.length - remaining.length;
      state.sessions = remaining;
      return { count };
    }
  };

  const db = { passwordResetToken, user, account, session };

  return {
    prisma: {
      ...db,
      $transaction: async (callback: (client: typeof db) => unknown) => callback(db)
    }
  };
});

const {
  consumePasswordReset,
  getPasswordResetTtlMinutes,
  hashPasswordResetToken,
  requestPasswordReset
} = await import("@/lib/password-reset");

const PASSWORD = "correct horse battery";
const NEW_PASSWORD = "a-brand-new-password";

function tokenFromLastResetEmail() {
  const [message] = mail.reset.slice(-1);
  return new URL(message.resetUrl).searchParams.get("token") ?? "";
}

async function addPasswordUser(overrides: Partial<UserRow> = {}) {
  const user: UserRow = {
    id: "user-1",
    email: "player@example.com",
    emailVerifiedAt: new Date("2026-01-01"),
    passwordChangedAt: null,
    ...overrides
  };
  state.users.push(user);
  state.accounts.push({
    id: `credential_${user.id}`,
    userId: user.id,
    providerId: "credential",
    password: await bcrypt.hash(PASSWORD, 4)
  });
  state.sessions.push({ id: "session-1", userId: user.id }, { id: "session-2", userId: user.id });
  return user;
}

describe("password reset requests", () => {
  beforeEach(() => {
    state.users = [];
    state.accounts = [];
    state.tokens = [];
    state.sessions = [];
    mail.reset = [];
    mail.google = [];
    mail.verification = [];
    mail.failDelivery = false;
    process.env.APP_BASE_URL = "https://pongladder.example";
    delete process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES;
  });

  it("emails a reset link built from the configured application URL and stores only a hash", async () => {
    await addPasswordUser();

    await expect(requestPasswordReset("  Player@Example.COM ")).resolves.toBe("reset-link");

    const [message] = mail.reset;
    const token = tokenFromLastResetEmail();
    expect(message.to).toBe("player@example.com");
    expect(message.resetUrl.startsWith("https://pongladder.example/reset-password?token=")).toBe(true);
    expect(message.expiresInMinutes).toBe(30);
    expect(token.length).toBeGreaterThan(20);
    expect(state.tokens).toHaveLength(1);
    expect(state.tokens[0].tokenHash).toBe(hashPasswordResetToken(token));
    expect(JSON.stringify(state.tokens)).not.toContain(token);
  });

  it("supersedes outstanding tokens when a new reset is requested", async () => {
    await addPasswordUser();

    await requestPasswordReset("player@example.com");
    const firstToken = tokenFromLastResetEmail();
    await requestPasswordReset("player@example.com");
    const secondToken = tokenFromLastResetEmail();

    expect(secondToken).not.toBe(firstToken);
    expect(state.tokens).toHaveLength(1);
    expect(state.tokens[0].tokenHash).toBe(hashPasswordResetToken(secondToken));
    await expect(consumePasswordReset(firstToken, NEW_PASSWORD)).resolves.toBe("invalid");
  });

  it("does nothing for an address without an account", async () => {
    await expect(requestPasswordReset("stranger@example.com")).resolves.toBe("no-account");

    expect(state.tokens).toHaveLength(0);
    expect(mail.reset).toHaveLength(0);
    expect(mail.google).toHaveLength(0);
    expect(mail.verification).toHaveLength(0);
  });

  it("sends the verification link instead of a reset link when the address is unverified", async () => {
    await addPasswordUser({ emailVerifiedAt: null });

    await expect(requestPasswordReset("player@example.com")).resolves.toBe("verification-required");

    expect(state.tokens).toHaveLength(0);
    expect(mail.reset).toHaveLength(0);
    expect(mail.verification).toEqual([{ userId: "user-1", email: "player@example.com" }]);
  });

  it("points Google-only accounts at Google Sign-In without giving them a password", async () => {
    state.users.push({
      id: "user-2",
      email: "google@example.com",
      emailVerifiedAt: new Date("2026-01-01"),
      passwordChangedAt: null
    });
    state.accounts.push({ id: "google_user-2", userId: "user-2", providerId: "google", password: null });

    await expect(requestPasswordReset("google@example.com")).resolves.toBe("google-sign-in");

    expect(state.tokens).toHaveLength(0);
    expect(mail.reset).toHaveLength(0);
    expect(mail.google).toEqual([
      { to: "google@example.com", loginUrl: "https://pongladder.example/login" }
    ]);
    expect(state.accounts.some((account) => account.providerId === "credential")).toBe(false);
  });

  it("keeps a delivery failure from changing the outcome the requester can observe", async () => {
    await addPasswordUser();
    mail.failDelivery = true;
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(requestPasswordReset("player@example.com")).resolves.toBe("reset-link");

    expect(logged).toHaveBeenCalledOnce();
    expect(String(logged.mock.calls[0][0])).not.toContain("player@example.com");
    logged.mockRestore();
  });

  it("reads the token lifetime from configuration and rejects unusable values", () => {
    expect(getPasswordResetTtlMinutes({})).toBe(30);
    expect(getPasswordResetTtlMinutes({ PASSWORD_RESET_TOKEN_TTL_MINUTES: "15" })).toBe(15);
    expect(() => getPasswordResetTtlMinutes({ PASSWORD_RESET_TOKEN_TTL_MINUTES: "0" })).toThrow(
      "between 5 and 120"
    );
    expect(() => getPasswordResetTtlMinutes({ PASSWORD_RESET_TOKEN_TTL_MINUTES: "999" })).toThrow(
      "between 5 and 120"
    );
    expect(() => getPasswordResetTtlMinutes({ PASSWORD_RESET_TOKEN_TTL_MINUTES: "soon" })).toThrow(
      "between 5 and 120"
    );
  });

  it("uses the configured lifetime for the stored expiry", async () => {
    process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES = "10";
    await addPasswordUser();

    await requestPasswordReset("player@example.com");

    const remaining = state.tokens[0].expiresAt.getTime() - Date.now();
    expect(remaining).toBeGreaterThan(9 * 60_000);
    expect(remaining).toBeLessThanOrEqual(10 * 60_000);
    expect(mail.reset[0].expiresInMinutes).toBe(10);
  });
});

describe("password reset completion", () => {
  beforeEach(() => {
    state.users = [];
    state.accounts = [];
    state.tokens = [];
    state.sessions = [];
    mail.reset = [];
    mail.google = [];
    mail.verification = [];
    mail.failDelivery = false;
    process.env.APP_BASE_URL = "https://pongladder.example";
    delete process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES;
  });

  it("replaces the password once, revokes sessions, and refuses a second use", async () => {
    await addPasswordUser();
    await requestPasswordReset("player@example.com");
    const token = tokenFromLastResetEmail();

    await expect(consumePasswordReset(token, NEW_PASSWORD)).resolves.toBe("success");

    const account = state.accounts[0];
    expect(await bcrypt.compare(NEW_PASSWORD, account.password!)).toBe(true);
    expect(await bcrypt.compare(PASSWORD, account.password!)).toBe(false);
    expect(state.sessions).toHaveLength(0);
    expect(state.users[0].passwordChangedAt).toBeInstanceOf(Date);
    expect(state.tokens[0].consumedAt).toBeInstanceOf(Date);

    await expect(consumePasswordReset(token, "another-password")).resolves.toBe("invalid");
    expect(await bcrypt.compare(NEW_PASSWORD, state.accounts[0].password!)).toBe(true);
  });

  it("rejects unknown and expired tokens without touching the password", async () => {
    await addPasswordUser();
    await requestPasswordReset("player@example.com");
    const token = tokenFromLastResetEmail();
    const storedPassword = state.accounts[0].password;

    await expect(consumePasswordReset("not-a-real-token", NEW_PASSWORD)).resolves.toBe("invalid");

    state.tokens[0].expiresAt = new Date(Date.now() - 1);
    await expect(consumePasswordReset(token, NEW_PASSWORD)).resolves.toBe("invalid");

    expect(state.accounts[0].password).toBe(storedPassword);
    expect(state.sessions).toHaveLength(2);
  });

  it("rejects a token issued for an address the account no longer uses", async () => {
    await addPasswordUser();
    await requestPasswordReset("player@example.com");
    const token = tokenFromLastResetEmail();

    state.users[0].email = "moved@example.com";

    await expect(consumePasswordReset(token, NEW_PASSWORD)).resolves.toBe("invalid");
  });

  it("rejects a token when the account has no password login or lost its verified email", async () => {
    await addPasswordUser();
    await requestPasswordReset("player@example.com");
    const token = tokenFromLastResetEmail();

    state.users[0].emailVerifiedAt = null;
    await expect(consumePasswordReset(token, NEW_PASSWORD)).resolves.toBe("invalid");

    state.users[0].emailVerifiedAt = new Date("2026-01-01");
    state.accounts = [];
    await expect(consumePasswordReset(token, NEW_PASSWORD)).resolves.toBe("invalid");
  });
});
