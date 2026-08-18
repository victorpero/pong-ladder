import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type ChallengeRow = {
  id: string;
  notifiedAt: Date | null;
  challenger: { id: string; username: string; fullName: string };
  challenged: { email: string | null };
  season: { organization: { name: string; slug: string } };
};

const state = vi.hoisted(() => ({
  challenges: [] as ChallengeRow[],
  sendError: null as (Error & { code?: string; responseCode?: number }) | null,
  sent: [] as Record<string, string>[],
  order: [] as string[]
}));

vi.mock("@/lib/prisma", () => {
  const find = (id: string) => state.challenges.find((challenge) => challenge.id === id) ?? null;

  return {
    prisma: {
      challenge: {
        findUnique: async ({ where }: { where: { id: string } }) => find(where.id),
        updateMany: async ({
          where,
          data
        }: {
          where: { id: string; notifiedAt: null };
          data: { notifiedAt: Date };
        }) => {
          const challenge = find(where.id);

          if (!challenge || challenge.notifiedAt !== null) {
            return { count: 0 };
          }

          state.order.push("claim");
          challenge.notifiedAt = data.notifiedAt;

          return { count: 1 };
        }
      }
    }
  };
});

vi.mock("@/lib/email", () => ({
  sendChallengeNotificationEmail: async (message: Record<string, string>) => {
    if (state.sendError) {
      throw state.sendError;
    }

    state.order.push("send");
    state.sent.push(message);
  }
}));

const { challengeNotificationIdempotencyKey, notifyChallengedPlayer } = await import(
  "@/lib/challenge-notifications"
);

function challenge(overrides: Partial<ChallengeRow> = {}): ChallengeRow {
  return {
    id: "challenge-1",
    notifiedAt: null,
    challenger: { id: "challenger", username: "alex", fullName: "Alex Example" },
    challenged: { email: "rival@example.com" },
    season: { organization: { name: "Example Club", slug: "example-club" } },
    ...overrides
  };
}

beforeEach(() => {
  state.challenges = [challenge()];
  state.sendError = null;
  state.sent = [];
  state.order = [];
  vi.stubEnv("APP_BASE_URL", "https://pongladder.example");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("challenge notifications", () => {
  it("emails the challenged player once with the challenger and a challenge link", async () => {
    await notifyChallengedPlayer("challenge-1");

    expect(state.sent).toEqual([
      {
        to: "rival@example.com",
        challengerName: "Alex Example",
        organizationName: "Example Club",
        challengeUrl: "https://pongladder.example/org/example-club/challenges",
        idempotencyKey: "challenge-notification/challenge-1"
      }
    ]);
  });

  it("links into the challenge's own organization", async () => {
    state.challenges = [
      challenge({ season: { organization: { name: "Other Org", slug: "other-org" } } })
    ];

    await notifyChallengedPlayer("challenge-1");

    expect(state.sent[0].challengeUrl).toBe("https://pongladder.example/org/other-org/challenges");
    expect(state.sent[0].organizationName).toBe("Other Org");
  });

  it("sends nothing a second time for the same challenge", async () => {
    await notifyChallengedPlayer("challenge-1");
    await notifyChallengedPlayer("challenge-1");

    expect(state.sent).toHaveLength(1);
  });

  it("presents a stable idempotency key so a duplicate send is deduplicated by Resend", async () => {
    expect(challengeNotificationIdempotencyKey("challenge-1")).toBe(
      "challenge-notification/challenge-1"
    );
    expect(challengeNotificationIdempotencyKey("challenge-1").length).toBeLessThanOrEqual(256);

    await notifyChallengedPlayer("challenge-1");

    expect(state.sent[0].idempotencyKey).toBe("challenge-notification/challenge-1");
  });

  it("records the notification only after the provider accepted the message", async () => {
    await notifyChallengedPlayer("challenge-1");

    expect(state.order).toEqual(["send", "claim"]);
    expect(state.challenges[0].notifiedAt).toBeInstanceOf(Date);
  });

  it("leaves a failed challenge retryable instead of marking it notified", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    state.sendError = new Error("SMTP timeout");

    await notifyChallengedPlayer("challenge-1");

    expect(state.challenges[0].notifiedAt).toBeNull();

    // The retry succeeds; Resend's idempotency key covers the case where the first attempt
    // was accepted but its acknowledgement was lost.
    state.sendError = null;
    await notifyChallengedPlayer("challenge-1");

    expect(state.sent).toHaveLength(1);
    expect(state.sent[0].idempotencyKey).toBe("challenge-notification/challenge-1");
    expect(state.challenges[0].notifiedAt).toBeInstanceOf(Date);
  });

  it("skips a challenge that was already announced", async () => {
    state.challenges = [challenge({ notifiedAt: new Date("2026-08-18T10:00:00Z") })];

    await notifyChallengedPlayer("challenge-1");

    expect(state.sent).toHaveLength(0);
  });

  it("skips a challenge that no longer exists", async () => {
    state.challenges = [];

    await notifyChallengedPlayer("challenge-1");

    expect(state.sent).toHaveLength(0);
  });

  it("swallows a provider failure and logs a classification, not the SMTP response", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    // Nodemailer surfaces the server's response verbatim, and that text can echo the
    // envelope recipient.
    const failure = Object.assign(
      new Error("550 5.1.1 <rival@example.com> recipient rejected"),
      { name: "Error", code: "EENVELOPE", responseCode: 550 }
    );
    state.sendError = failure;

    await expect(notifyChallengedPlayer("challenge-1")).resolves.toBeUndefined();

    expect(logged).toHaveBeenCalledOnce();
    const [message] = logged.mock.calls[0];
    expect(message).toContain("challenge-1");
    expect(message).toContain("code=EENVELOPE");
    expect(message).toContain("responseCode=550");
    expect(message).not.toContain("rival@example.com");
    expect(message).not.toContain("recipient rejected");
  });

  it("still classifies a failure that carries no SMTP response data", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    state.sendError = new Error("EMAIL_FROM must be configured");

    await notifyChallengedPlayer("challenge-1");

    const [message] = logged.mock.calls[0];
    expect(message).toContain("challenge-1");
    expect(message).toContain("type=Error");
    expect(message).not.toContain("EMAIL_FROM must be configured");
  });
});
