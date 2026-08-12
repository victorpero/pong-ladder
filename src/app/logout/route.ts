import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  const signedOut = await auth.api.signOut({ headers: request.headers, asResponse: true });
  const response = NextResponse.redirect(new URL("/login", request.url));

  const setCookie = signedOut.headers.get("set-cookie");
  if (setCookie) {
    response.headers.set("set-cookie", setCookie);
  }

  return response;
}
