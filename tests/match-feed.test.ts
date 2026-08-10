import { describe, expect, it } from "vitest";
import { matchFeedOrderBy, sortByRegistration } from "@/lib/match-feed";

function result(id: string, playedAt: string, createdAt: string) {
  return { id, playedAt: new Date(playedAt), createdAt: new Date(createdAt) };
}

describe("matchFeedOrderBy", () => {
  it("orders the results feed by registration time, then match id", () => {
    expect(matchFeedOrderBy).toEqual([{ createdAt: "desc" }, { id: "desc" }]);
  });
});

describe("sortByRegistration", () => {
  it("shows the most recently registered result first", () => {
    const sorted = sortByRegistration([
      result("match-old", "2026-05-01T10:00:00Z", "2026-05-01T10:00:00Z"),
      result("match-new", "2026-05-03T10:00:00Z", "2026-05-03T10:00:00Z")
    ]);

    expect(sorted.map((match) => match.id)).toEqual(["match-new", "match-old"]);
  });

  it("keeps a backdated result on top when it was registered last", () => {
    const sorted = sortByRegistration([
      result("registered-first", "2026-05-02T10:00:00Z", "2026-05-02T10:00:00Z"),
      result("backdated", "2026-01-01T10:00:00Z", "2026-05-04T10:00:00Z")
    ]);

    expect(sorted.map((match) => match.id)).toEqual(["backdated", "registered-first"]);
  });

  it("stays deterministic when registration timestamps are identical", () => {
    const sameMoment = "2026-05-05T10:00:00Z";
    const ascending = sortByRegistration([
      result("match-a", sameMoment, sameMoment),
      result("match-b", sameMoment, sameMoment)
    ]);
    const descending = sortByRegistration([
      result("match-b", sameMoment, sameMoment),
      result("match-a", sameMoment, sameMoment)
    ]);

    expect(ascending.map((match) => match.id)).toEqual(["match-b", "match-a"]);
    expect(descending.map((match) => match.id)).toEqual(ascending.map((match) => match.id));
  });

  it("does not mutate the list it was given", () => {
    const matches = [
      result("match-old", "2026-05-01T10:00:00Z", "2026-05-01T10:00:00Z"),
      result("match-new", "2026-05-03T10:00:00Z", "2026-05-03T10:00:00Z")
    ];

    sortByRegistration(matches);

    expect(matches.map((match) => match.id)).toEqual(["match-old", "match-new"]);
  });
});
