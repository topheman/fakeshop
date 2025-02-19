import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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
          {
            id: 2,
            quantity: 1,
          },
          {
            id: 3,
            quantity: 3,
          },
          {
            id: 4,
            quantity: 4,
          },
          {
            id: 5,
            quantity: 5,
          },
          {
            id: 6,
            quantity: 6,
          },
          {
            id: 7,
            quantity: 7,
          },
          {
            id: 8,
            quantity: 8,
          },
        ],
      }),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });
  }

  return response;
}

// Only run middleware on pages, not on API routes or static files
export const config = {
  matcher: "/((?!api|_next/static|_next/image|favicon.ico).*)",
};
