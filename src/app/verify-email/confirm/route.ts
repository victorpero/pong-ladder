import { NextResponse } from "next/server";
import { consumeEmailVerification } from "@/lib/email-verification";
import { postAuthenticationPath } from "@/lib/organization-paths";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const token = requestUrl.searchParams.get("token");
  const validToken = token && token.length <= 256 ? await consumeEmailVerification(token) : false;
  const nextPath = postAuthenticationPath(requestUrl.searchParams.get("next"));
  const destination = new URL("/verify-email", request.url);
  destination.searchParams.set("status", validToken ? "verified" : "invalid");
  destination.searchParams.set("next", nextPath);
  return NextResponse.redirect(destination);
}
