import { afterEach, describe, expect, it, vi } from "vitest";

type SentMessage = Record<string, string> & { headers?: Record<string, string> };

const state = vi.hoisted(() => ({ sent: [] as SentMessage[] }));

vi.mock("nodemailer", () => ({
  default: {
    createTransport: () => ({
      sendMail: async (message: SentMessage) => {
        state.sent.push(message);
      }
    })
  }
}));

const {
  getEmailTransportConfig,
  sendChallengeNotificationEmail,
  sendGoogleSignInNoticeEmail,
  sendPasswordResetEmail,
  sendVerificationEmail
} = await import("@/lib/email");

describe("email transport configuration", () => {
  it("uses the Resend API key for the existing SMTP transport", () => {
    const config = getEmailTransportConfig({
      SMTP_HOST: "smtp.resend.com",
      SMTP_PORT: "587",
      SMTP_SECURE: "false",
      EMAIL_FROM: "Pong Ladder <notifications@pongladder.com>",
      RESEND_API_KEY: "example-only"
    });

    expect(config).toEqual({
      from: "Pong Ladder <notifications@pongladder.com>",
      transport: {
        host: "smtp.resend.com",
        port: 587,
        secure: false,
        auth: { user: "resend", pass: "example-only" }
      }
    });
  });

  it("requires credentials when Resend SMTP delivery is configured", () => {
    expect(() =>
      getEmailTransportConfig({
        SMTP_HOST: "smtp.resend.com",
        EMAIL_FROM: "Pong Ladder <notifications@pongladder.com>"
      })
    ).toThrow("RESEND_API_KEY or SMTP_PASSWORD must be configured for Resend SMTP delivery.");
  });

  it("preserves the existing generic SMTP password configuration", () => {
    const config = getEmailTransportConfig({
      SMTP_HOST: "smtp.example.com",
      EMAIL_FROM: "Pong Ladder <notifications@example.com>",
      SMTP_USER: "mailer",
      SMTP_PASSWORD: "example-only"
    });

    expect(config.transport.auth).toEqual({ user: "mailer", pass: "example-only" });
  });
});

describe("verification email delivery", () => {
  afterEach(() => {
    state.sent = [];
    vi.unstubAllEnvs();
  });

  it("sends the branded template with a plain-text alternative", async () => {
    vi.stubEnv("EMAIL_DELIVERY_MODE", "smtp");
    vi.stubEnv("SMTP_HOST", "smtp.example.com");
    vi.stubEnv("EMAIL_FROM", "Pong Ladder <notifications@example.com>");
    vi.stubEnv("SMTP_USER", "mailer");
    vi.stubEnv("SMTP_PASSWORD", "example-only");

    await sendVerificationEmail({
      to: "player@example.com",
      verificationUrl: "https://pongladder.example/verify-email/confirm?token=example-token",
      expiresInMinutes: 30
    });

    expect(state.sent).toHaveLength(1);
    const [message] = state.sent;
    expect(message.from).toBe("Pong Ladder <notifications@example.com>");
    expect(message.to).toBe("player@example.com");
    expect(message.subject).toBe("Verify your Pong Ladder email");
    expect(message.html).toContain(">Verify email</a>");
    expect(message.html).toContain(
      'href="https://pongladder.example/verify-email/confirm?token=example-token"'
    );
    expect(message.text).toContain(
      "https://pongladder.example/verify-email/confirm?token=example-token"
    );
    expect(message.text).toContain("expires in 30 minutes");
  });

  it("keeps console delivery for local development", async () => {
    vi.stubEnv("EMAIL_DELIVERY_MODE", "console");
    const info = vi.spyOn(console, "info").mockImplementation(() => {});

    await sendVerificationEmail({
      to: "player@example.com",
      verificationUrl: "https://pongladder.example/verify-email/confirm?token=example-token",
      expiresInMinutes: 30
    });

    expect(state.sent).toHaveLength(0);
    expect(info).toHaveBeenCalledOnce();
    info.mockRestore();
  });
});

describe("password reset email delivery", () => {
  afterEach(() => {
    state.sent = [];
    vi.unstubAllEnvs();
  });

  function useSmtp() {
    vi.stubEnv("EMAIL_DELIVERY_MODE", "smtp");
    vi.stubEnv("SMTP_HOST", "smtp.example.com");
    vi.stubEnv("EMAIL_FROM", "Pong Ladder <notifications@example.com>");
    vi.stubEnv("SMTP_USER", "mailer");
    vi.stubEnv("SMTP_PASSWORD", "example-only");
  }

  it("uses the same sender identity and transport as the verification email", async () => {
    useSmtp();

    await sendPasswordResetEmail({
      to: "player@example.com",
      resetUrl: "https://pongladder.example/reset-password?token=example-token",
      expiresInMinutes: 30
    });

    expect(state.sent).toHaveLength(1);
    const [message] = state.sent;
    expect(message.from).toBe("Pong Ladder <notifications@example.com>");
    expect(message.to).toBe("player@example.com");
    expect(message.subject).toBe("Reset your Pong Ladder password");
    expect(message.html).toContain(">Choose a new password</a>");
    expect(message.text).toContain("https://pongladder.example/reset-password?token=example-token");
  });

  it("sends the Google Sign-In notice without a reset link", async () => {
    useSmtp();

    await sendGoogleSignInNoticeEmail({
      to: "google@example.com",
      loginUrl: "https://pongladder.example/login"
    });

    expect(state.sent).toHaveLength(1);
    const [message] = state.sent;
    expect(message.subject).toBe("Your Pong Ladder account uses Google Sign-In");
    expect(message.html).not.toContain("reset-password");
    expect(message.text).not.toContain("reset-password");
  });

  it("keeps the reset link out of SMTP delivery logs", async () => {
    useSmtp();
    const info = vi.spyOn(console, "info").mockImplementation(() => {});

    await sendPasswordResetEmail({
      to: "player@example.com",
      resetUrl: "https://pongladder.example/reset-password?token=example-token",
      expiresInMinutes: 30
    });

    expect(info).not.toHaveBeenCalled();
    info.mockRestore();
  });
});

describe("challenge notification email delivery", () => {
  afterEach(() => {
    state.sent = [];
    vi.unstubAllEnvs();
  });

  const message = {
    to: "rival@example.com",
    challengerName: "Alex Example",
    organizationName: "Example Club",
    challengeUrl: "https://pongladder.example/org/example-club/challenges",
    idempotencyKey: "challenge-notification/challenge-1"
  };

  it("reuses the shared sender identity and transport", async () => {
    vi.stubEnv("EMAIL_DELIVERY_MODE", "smtp");
    vi.stubEnv("SMTP_HOST", "smtp.example.com");
    vi.stubEnv("EMAIL_FROM", "Pong Ladder <notifications@example.com>");
    vi.stubEnv("SMTP_USER", "mailer");
    vi.stubEnv("SMTP_PASSWORD", "example-only");

    await sendChallengeNotificationEmail(message);

    expect(state.sent).toHaveLength(1);
    const [sent] = state.sent;
    expect(sent.from).toBe("Pong Ladder <notifications@example.com>");
    expect(sent.to).toBe("rival@example.com");
    expect(sent.subject).toBe("You have a new Pong Ladder challenge");
    expect(sent.html).toContain(">View challenge</a>");
    expect(sent.text).toContain("https://pongladder.example/org/example-club/challenges");
  });

  it("passes the idempotency key to Resend as an SMTP header", async () => {
    vi.stubEnv("EMAIL_DELIVERY_MODE", "smtp");
    vi.stubEnv("SMTP_HOST", "smtp.resend.com");
    vi.stubEnv("EMAIL_FROM", "Pong Ladder <notifications@example.com>");
    vi.stubEnv("RESEND_API_KEY", "example-only");

    await sendChallengeNotificationEmail(message);

    expect(state.sent[0].headers).toEqual({
      "Resend-Idempotency-Key": "challenge-notification/challenge-1"
    });
  });

  it("leaves the other transactional emails without idempotency headers", async () => {
    vi.stubEnv("EMAIL_DELIVERY_MODE", "smtp");
    vi.stubEnv("SMTP_HOST", "smtp.example.com");
    vi.stubEnv("EMAIL_FROM", "Pong Ladder <notifications@example.com>");
    vi.stubEnv("SMTP_USER", "mailer");
    vi.stubEnv("SMTP_PASSWORD", "example-only");

    await sendVerificationEmail({
      to: "player@example.com",
      verificationUrl: "https://pongladder.example/verify-email/confirm?token=example-token",
      expiresInMinutes: 30
    });

    expect(state.sent[0].headers).toBeUndefined();
  });

  it("keeps console delivery for local development", async () => {
    vi.stubEnv("EMAIL_DELIVERY_MODE", "console");
    const info = vi.spyOn(console, "info").mockImplementation(() => {});

    await sendChallengeNotificationEmail(message);

    expect(state.sent).toHaveLength(0);
    expect(info).toHaveBeenCalledOnce();
    info.mockRestore();
  });
});
