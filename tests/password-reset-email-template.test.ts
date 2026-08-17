import { describe, expect, it } from "vitest";
import {
  GOOGLE_SIGN_IN_NOTICE_SUBJECT,
  PASSWORD_RESET_EMAIL_SUBJECT,
  renderGoogleSignInNoticeEmail,
  renderPasswordResetEmail
} from "@/lib/password-reset-email-template";

const RESET_URL = "https://pongladder.example/reset-password?token=example-token";
const LOGIN_URL = "https://pongladder.example/login";

function renderReset(overrides: Partial<Parameters<typeof renderPasswordResetEmail>[0]> = {}) {
  return renderPasswordResetEmail({ resetUrl: RESET_URL, expiresInMinutes: 30, ...overrides });
}

describe("password reset email", () => {
  it("uses a subject that names the action", () => {
    expect(renderReset().subject).toBe(PASSWORD_RESET_EMAIL_SUBJECT);
    expect(renderReset().subject).toBe("Reset your Pong Ladder password");
  });

  it("renders the branded card with a reset button pointing at the supplied URL", () => {
    const { html } = renderReset();

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Pong Ladder");
    expect(html).toContain("Reset your password");
    expect(html).toContain(">Choose a new password</a>");
    expect(html).toContain('href="https://pongladder.example/reset-password?token=example-token"');
  });

  it("keeps the message self-contained, like the rest of the transactional email", () => {
    const { html } = renderReset();

    expect(html).toContain("<table");
    expect(html).toContain("-apple-system");
    expect(html).toContain("@media only screen and (max-width: 620px)");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<form");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<link");
    expect(html).not.toMatch(/https?:\/\/(?!pongladder\.example)/);
  });

  it("states the expiry, single use, and what to do about an unwanted request", () => {
    const { html, text } = renderReset();

    expect(html).toContain("This link expires in 30 minutes and can be used once.");
    expect(html).toContain("If you did not ask for a password reset");
    expect(text).toContain("This link expires in 30 minutes and can be used once.");
    expect(text).toContain(RESET_URL);
    expect(text).toContain("If you did not ask for a password reset");
    expect(text).not.toContain("<");
  });

  it("reports the expiry the caller supplies", () => {
    expect(renderReset({ expiresInMinutes: 1 }).text).toContain("expires in 1 minute and");
    expect(renderReset({ expiresInMinutes: 15 }).html).toContain("expires in 15 minutes and");
  });

  it("escapes dynamic values used in HTML text and attributes", () => {
    const { html } = renderReset({
      resetUrl: 'https://pongladder.example/reset-password?token=a"b&next=<script>'
    });

    expect(html).toContain("token=a%22b&amp;next=%3Cscript%3E");
    expect(html).not.toMatch(/<script/i);
  });

  it("rejects reset URLs that are relative or use an unsupported scheme", () => {
    expect(() => renderReset({ resetUrl: "/reset-password?token=example" })).toThrow(
      "absolute password reset URL"
    );
    expect(() => renderReset({ resetUrl: "javascript:alert(1)" })).toThrow("HTTP or HTTPS");
  });

  it("rejects a missing or non-positive expiry", () => {
    expect(() => renderReset({ expiresInMinutes: 0 })).toThrow("positive expiry");
    expect(() => renderReset({ expiresInMinutes: Number.NaN })).toThrow("positive expiry");
  });

  it("never carries a password or a hint about who requested the reset", () => {
    const { html, text } = renderReset();

    expect(html.toLowerCase()).not.toContain("username");
    expect(text.toLowerCase()).not.toContain("username");
    expect(`${html}${text}`).not.toMatch(/current password is/i);
  });
});

describe("Google Sign-In notice email", () => {
  it("explains that the account has no password without offering to create one", () => {
    const { subject, html, text } = renderGoogleSignInNoticeEmail({ loginUrl: LOGIN_URL });

    expect(subject).toBe(GOOGLE_SIGN_IN_NOTICE_SUBJECT);
    expect(html).toContain("Sign in with Google");
    expect(html).toContain("there is no password to reset");
    expect(html).toContain('href="https://pongladder.example/login"');
    expect(html).not.toContain("reset-password");
    expect(text).toContain("Sign in with Google");
    expect(text).toContain(LOGIN_URL);
    expect(text).not.toContain("<");
  });

  it("rejects a login URL that is relative or uses an unsupported scheme", () => {
    expect(() => renderGoogleSignInNoticeEmail({ loginUrl: "/login" })).toThrow(
      "absolute password reset URL"
    );
    expect(() => renderGoogleSignInNoticeEmail({ loginUrl: "javascript:alert(1)" })).toThrow(
      "HTTP or HTTPS"
    );
  });
});
