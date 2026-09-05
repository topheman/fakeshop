import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { COOKIE_MAX_AGE } from "@/utils/constants";

export function proxy(request: NextRequest) {
  const response = NextResponse.next();

  // Check if cart cookie exists
  if (!request.cookies.has("cart")) {
    // Set empty cart cookie
    response.cookies.set({
      name: "cart",
      value: JSON.stringify({
        items: [],
      }),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: COOKIE_MAX_AGE,
    });
  }

  if (!request.cookies.has("orders")) {
    response.cookies.set({
      name: "orders",
      value: JSON.stringify([]),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: COOKIE_MAX_AGE,
    });
  }

  return response;
}

// Only run the proxy on pages, not on API routes or static files
export const config = {
  matcher: "/((?!api|_next/static|_next/image|favicon.ico).*)",
};
