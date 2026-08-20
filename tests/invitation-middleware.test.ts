import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { middleware } from "@/middleware";

const token = "c".repeat(43);

function visit(path: string, session?: string) {
  const request = new NextRequest(new URL(`https://pongladder.com${path}`));

  if (session) {
    request.cookies.set("better-auth.session_token", session);
  }

  return middleware(request);
}

describe("invitation routing", () => {
  it("lets a signed-out visitor open an invitation before authenticating", async () => {
    const response = await visit(`/sv/join/${token}`);

    expect(response.headers.get("location")).toBeNull();
  });

  it("returns a signed-in visitor to the invitation they opened", async () => {
    const response = await visit(`/sv/login?next=%2Fsv%2Fjoin%2F${token}`, "session-token");

    expect(response.headers.get("location")).toBe(`https://pongladder.com/sv/join/${token}`);
  });

  it("sends a signed-in visitor without a pending destination to organization selection", async () => {
    const response = await visit("/sv/login", "session-token");

    expect(response.headers.get("location")).toBe("https://pongladder.com/sv/organizations");
  });

  it("refuses an off-site destination when returning a signed-in visitor", async () => {
    const response = await visit("/en/login?next=https%3A%2F%2Fevil.example.com", "session-token");

    expect(response.headers.get("location")).toBe("https://pongladder.com/en/organizations");
  });

  it("still requires authentication for organization pages", async () => {
    const response = await visit("/sv/org/polisen/ladder");

    expect(response.headers.get("location")).toBe(
      "https://pongladder.com/sv/login?next=%2Fsv%2Forg%2Fpolisen%2Fladder"
    );
  });
});
