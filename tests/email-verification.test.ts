import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ transactionClient: null as Record<string, unknown> | null }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: async (callback: (client: Record<string, unknown>) => unknown) =>
      callback(state.transactionClient ?? {})
  }
}));

const { consumeEmailVerification, hashVerificationToken, normalizeEmail } = await import(
  "@/lib/email-verification"
);

describe("email verification", () => {
  beforeEach(() => {
    state.transactionClient = null;
  });

  it("normalizes email addresses and hashes tokens without storing the raw value", () => {
    expect(normalizeEmail("  Player@Example.COM ")).toBe("player@example.com");
    expect(hashVerificationToken("secret-token")).toMatch(/^[a-f0-9]{64}$/);
    expect(hashVerificationToken("secret-token")).not.toContain("secret-token");
  });

  it("atomically consumes a valid token and verifies the current email", async () => {
    const updates: unknown[] = [];
    state.transactionClient = {
      emailVerificationToken: {
        findUnique: vi.fn().mockResolvedValue({
          id: "token-1",
          userId: "user-1",
          email: "player@example.com",
          expiresAt: new Date(Date.now() + 60_000),
          consumedAt: null
        }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        deleteMany: vi.fn().mockResolvedValue({ count: 0 })
      },
      user: {
        findUnique: vi.fn().mockResolvedValue({ email: "Player@Example.com" }),
        update: vi.fn().mockImplementation(({ data }) => {
          updates.push(data);
          return Promise.resolve({});
        })
      }
    };

    await expect(consumeEmailVerification("valid-token")).resolves.toBe(true);
    expect(updates).toEqual([
      expect.objectContaining({ emailVerified: true, emailVerifiedAt: expect.any(Date) })
    ]);
  });

  it("rejects expired, reused, and superseded-email tokens", async () => {
    const findUnique = vi.fn();
    state.transactionClient = {
      emailVerificationToken: {
        findUnique,
        updateMany: vi.fn(),
        deleteMany: vi.fn()
      },
      user: {
        findUnique: vi.fn().mockResolvedValue({ email: "new@example.com" }),
        update: vi.fn()
      }
    };

    findUnique.mockResolvedValueOnce(null);
    await expect(consumeEmailVerification("unknown")).resolves.toBe(false);

    findUnique.mockResolvedValueOnce({
      id: "used",
      userId: "user-1",
      email: "player@example.com",
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: new Date()
    });
    await expect(consumeEmailVerification("used")).resolves.toBe(false);

    findUnique.mockResolvedValueOnce({
      id: "expired",
      userId: "user-1",
      email: "player@example.com",
      expiresAt: new Date(Date.now() - 1),
      consumedAt: null
    });
    await expect(consumeEmailVerification("expired")).resolves.toBe(false);

    findUnique.mockResolvedValueOnce({
      id: "old-email",
      userId: "user-1",
      email: "old@example.com",
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: null
    });
    await expect(consumeEmailVerification("old-email")).resolves.toBe(false);
  });
});
