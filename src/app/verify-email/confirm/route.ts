import { NextResponse } from "next/server";
import { consumeEmailVerification } from "@/lib/email-verification";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const token = requestUrl.searchParams.get("token");
  const validToken = token && token.length <= 256 ? await consumeEmailVerification(token) : false;
  const destination = new URL("/verify-email", request.url);
  destination.searchParams.set("status", validToken ? "verified" : "invalid");
  return NextResponse.redirect(destination);
}
