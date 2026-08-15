import { describe, expect, it } from "vitest";
import {
  VERIFICATION_EMAIL_SUBJECT,
  escapeHtml,
  renderVerificationEmail
} from "@/lib/verification-email-template";

const VERIFICATION_URL =
  "https://pongladder.example/verify-email/confirm?token=example-token&next=%2Fladder";

function render(overrides: Partial<Parameters<typeof renderVerificationEmail>[0]> = {}) {
  return renderVerificationEmail({
    verificationUrl: VERIFICATION_URL,
    expiresInMinutes: 30,
    ...overrides
  });
}

describe("verification email template", () => {
  it("keeps the established subject", () => {
    expect(render().subject).toBe(VERIFICATION_EMAIL_SUBJECT);
    expect(render().subject).toBe("Verify your Pong Ladder email");
  });

  it("renders a branded card with a verify button pointing at the supplied URL", () => {
    const { html } = render();

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Pong Ladder");
    expect(html).toContain("Verify your email address");
    expect(html).toContain(">Verify email</a>");
    expect(html).toContain(
      'href="https://pongladder.example/verify-email/confirm?token=example-token&amp;next=%2Fladder"'
    );
  });

  it("uses table layout, inline styles, and system fonts instead of external assets", () => {
    const { html } = render();

    expect(html).toContain("<table");
    expect(html).toContain("-apple-system");
    expect(html).toContain("@media only screen and (max-width: 620px)");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<form");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<link");
    expect(html).not.toMatch(/https?:\/\/(?!pongladder\.example)/);
  });

  it("shows the expiry, the full fallback URL, and unsolicited-message guidance", () => {
    const { html, text } = render();

    expect(html).toContain("This link expires in 30 minutes and can be used once.");
    expect(html).toContain(
      ">https://pongladder.example/verify-email/confirm?token=example-token&amp;next=%2Fladder</a>"
    );
    expect(html).toContain("If you did not create or update a Pong Ladder account");

    expect(text).toContain("This link expires in 30 minutes and can be used once.");
    expect(text).toContain(VERIFICATION_URL);
    expect(text).toContain("If you did not create or update a Pong Ladder account");
  });

  it("sends a plain-text alternative carrying the same essential information", () => {
    const { text } = render();

    expect(text).toContain("PONG LADDER");
    expect(text).toContain("Verify your email address");
    expect(text).toContain("Open this link to verify your email:");
    expect(text).not.toContain("<");
  });

  it("reports the expiry that the caller supplies", () => {
    expect(render({ expiresInMinutes: 1 }).text).toContain("expires in 1 minute and");
    expect(render({ expiresInMinutes: 15 }).html).toContain("expires in 15 minutes and");
  });

  it("encodes and escapes dynamic values used in HTML text and attributes", () => {
    const { html } = render({
      verificationUrl: 'https://pongladder.example/verify-email/confirm?token=a"b&next=<script>'
    });

    expect(html).toContain("token=a%22b&amp;next=%3Cscript%3E");
    expect(html).not.toMatch(/<script/i);
    expect(escapeHtml("<a href=\"x\">&'")).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&#39;");
  });

  it("rejects verification URLs that are relative or use an unsupported scheme", () => {
    expect(() => render({ verificationUrl: "/verify-email/confirm?token=example" })).toThrow(
      "absolute verification URL"
    );
    expect(() => render({ verificationUrl: "javascript:alert(1)" })).toThrow("HTTP or HTTPS");
  });

  it("rejects a missing or non-positive expiry", () => {
    expect(() => render({ expiresInMinutes: 0 })).toThrow("positive expiry");
    expect(() => render({ expiresInMinutes: Number.NaN })).toThrow("positive expiry");
  });
});
