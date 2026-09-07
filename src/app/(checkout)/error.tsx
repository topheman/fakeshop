"use client";

import { RouteError } from "@/components/RouteError";

/**
 * `/checkout` reads the cart from a cookie and then calls `getProduct` for
 * every line, with no try/catch anywhere in the path. Before this boundary
 * existed a catalog outage there fell through to Next's built-in 500 page,
 * which is the one screen in the app that shows none of its own chrome.
 */
export default function CheckoutError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <RouteError
      error={error}
      retry={retry}
      title="Checkout is unavailable"
      description="Your cart is safe — it lives in a cookie, not on the server. Try again in a moment."
    />
  );
}
