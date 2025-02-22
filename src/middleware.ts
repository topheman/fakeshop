import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { COOKIE_MAX_AGE } from "@/utils/constants";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Check if cart cookie exists
  if (!request.cookies.has("cart")) {
    // Set empty cart cookie
    response.cookies.set({
      name: "cart",
      value: JSON.stringify({
        // temporary adding 2 items to the cart
        items: [
          {
            id: 1,
            quantity: 1,
          },
        ],
      }),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: COOKIE_MAX_AGE,
    });
  }

  return response;
}

// Only run middleware on pages, not on API routes or static files
export const config = {
  matcher: "/((?!api|_next/static|_next/image|favicon.ico).*)",
};
