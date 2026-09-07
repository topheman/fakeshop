"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

import { PageContainer } from "./Layout";

/**
 * The UI behind both `error.tsx` files. Error boundaries have to be Client
 * Components — React needs `getDerivedStateFromError` on the client, and the
 * retry button is an event handler — so the fallback cannot be a Server
 * Component even though what failed was one.
 *
 * `retry` is not `reset`. `reset()` clears the boundary's error state and
 * re-renders the same children from the RSC payload the client already has,
 * which for a Server Component that threw means rendering the same failure
 * again. `retry()` asks the server for the segment again, so the render that
 * failed actually runs a second time. It landed as a stable prop in 16.3.
 */
export function RouteError({
  error,
  retry,
  title,
  description,
}: {
  error: Error & { digest?: string };
  retry: () => void;
  title: string;
  description: string;
}) {
  useEffect(() => {
    // In production `error.message` is a generic string and `error.digest` is
    // the hash that matches the real message in the server logs. Logging the
    // digest is the only way to correlate the two.
    console.error("Route error", { digest: error.digest, error });
  }, [error]);

  return (
    <PageContainer>
      <div
        className="flex min-h-[50vh] flex-col items-center justify-center text-center"
        id="route-error"
      >
        <h2 className="mb-4 text-2xl font-bold text-primary">{title}</h2>
        <p className="mb-6 max-w-prose text-gray-600">{description}</p>
        <Button onClick={() => retry()}>Try again</Button>
        {error.digest ? (
          <p className="mt-6 text-xs text-gray-400">{`Reference: ${error.digest}`}</p>
        ) : null}
      </div>
    </PageContainer>
  );
}
