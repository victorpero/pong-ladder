import { describe, expect, it } from "vitest";
import { getPublicPlayerName, getPublicPlayerNames, normalizeFullName } from "@/lib/display-name";

describe("public player names", () => {
  it("shows the full name", () => {
    expect(getPublicPlayerName({ id: "1", username: "victor", fullName: "Victor Pero" })).toBe("Victor Pero");
  });

  it("supports multiple last names", () => {
    expect(getPublicPlayerName({ id: "1", username: "linnea", fullName: "Linnea Berg Andersson" })).toBe(
      "Linnea Berg Andersson"
    );
  });

  it("keeps full names when players have similar names", () => {
    const names = getPublicPlayerNames([
      { id: "1", username: "victor-pero", fullName: "Victor Pero" },
      { id: "2", username: "victor-palm", fullName: "Victor Palm" }
    ]);

    expect(names.get("1")).toBe("Victor Pero");
    expect(names.get("2")).toBe("Victor Palm");
  });

  it("falls back to the username when full name is missing", () => {
    expect(getPublicPlayerName({ id: "1", username: "victor", fullName: "" })).toBe("victor");
  });

  it("normalizes extra whitespace", () => {
    expect(normalizeFullName("  Victor   Per   Olofsson  ")).toBe("Victor Per Olofsson");
  });
});
