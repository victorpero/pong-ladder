import { describe, expect, it } from "vitest";
import { usernameBase, usernameCandidate } from "@/lib/username";

describe("identity usernames", () => {
  it("creates safe username bases from identity-provider profiles", () => {
    expect(usernameBase("  Åsa.Player+Pong ")).toBe("asa-player-pong");
    expect(usernameBase("---")).toBe("player");
  });

  it("adds collision suffixes without exceeding the username limit", () => {
    const base = usernameBase("a-very-long-player-name-that-needs-truncation");
    expect(usernameCandidate(base, 0).length).toBeLessThanOrEqual(30);
    expect(usernameCandidate(base, 8)).toMatch(/-9$/);
    expect(usernameCandidate(base, 8).length).toBeLessThanOrEqual(30);
  });
});
