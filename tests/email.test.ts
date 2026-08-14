import { describe, expect, it } from "vitest";
import { getEmailTransportConfig } from "@/lib/email";

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
