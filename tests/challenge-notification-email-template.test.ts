import { describe, expect, it } from "vitest";
import {
  CHALLENGE_NOTIFICATION_EMAIL_SUBJECT,
  renderChallengeNotificationEmail
} from "@/lib/challenge-notification-email-template";

const input = {
  challengerName: "Alex Example",
  organizationName: "Example Club",
  challengeUrl: "https://pongladder.example/org/example-club/challenges"
};

describe("challenge notification email", () => {
  it("names the challenger and links to the challenge", () => {
    const email = renderChallengeNotificationEmail(input);

    expect(email.subject).toBe(CHALLENGE_NOTIFICATION_EMAIL_SUBJECT);
    expect(email.html).toContain("Alex Example has challenged you to a match in Example Club.");
    expect(email.html).toContain('href="https://pongladder.example/org/example-club/challenges"');
    expect(email.html).toContain(">View challenge</a>");
  });

  it("ships a plain-text alternative with the same essentials", () => {
    const email = renderChallengeNotificationEmail(input);

    expect(email.text).toContain("Alex Example has challenged you to a match in Example Club.");
    expect(email.text).toContain("https://pongladder.example/org/example-club/challenges");
    expect(email.text).toContain("PONG LADDER");
  });

  it("escapes challenger and organization names in the HTML body", () => {
    const email = renderChallengeNotificationEmail({
      ...input,
      challengerName: '<script>alert("x")</script>',
      organizationName: "Tom & Jerry's"
    });

    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("Tom &amp; Jerry&#39;s");
  });

  it("rejects a challenge URL that is not absolute HTTP(S)", () => {
    expect(() => renderChallengeNotificationEmail({ ...input, challengeUrl: "/challenges" })).toThrow(
      "A challenge notification email requires an absolute challenge notification URL."
    );
  });

  it("requires a challenger name and an organization name", () => {
    expect(() => renderChallengeNotificationEmail({ ...input, challengerName: "  " })).toThrow(
      "A challenge notification email requires a challenger name."
    );
    expect(() => renderChallengeNotificationEmail({ ...input, organizationName: "" })).toThrow(
      "A challenge notification email requires a organization name."
    );
  });
});
