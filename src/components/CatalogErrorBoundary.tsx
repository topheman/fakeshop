"use client";

import { catchError, type ErrorInfo } from "next/error";

import { Button } from "@/components/ui/button";

/**
 * A component-level error boundary for anything that reads the dummyjson
 * catalog.
 *
 * `catchError` takes a fallback of the unusual shape `(props, errorInfo)` and
 * returns a real component that accepts `props` plus `children`. It is the
 * programmatic sibling of `error.tsx`: same boundary, but scoped to a subtree
 * instead of a route segment, so the heading and the rest of the page around
 * the failure stay on screen.
 *
 * The reason to reach for this rather than a hand-written React error boundary
 * class is `notFound()` and `redirect()`. Both work by throwing a sentinel
 * error that Next catches higher up; a plain `componentDidCatch` swallows them
 * and turns a redirect into an error screen. `catchError` re-throws them.
 *
 * `retry()` re-runs the Server Component on the server. `reset()` — also
 * available on `ErrorInfo` — only clears the boundary's state and re-renders
 * what the client already has, which cannot fix a server-side fetch. There is
 * no reset button here on purpose.
 *
 * `ErrorInfo["error"]` is typed `unknown`, not `Error` — the documented
 * example reads `error.message` straight off it and does not typecheck.
 * `error.tsx` is the one that gets `Error & { digest?: string }`, because Next
 * generates the types for that file convention itself.
 */
function CatalogErrorFallback(
  { label }: { label: string },
  { error, retry }: ErrorInfo,
) {
  return (
    <div
      role="alert"
      className="my-4 rounded-lg border border-dashed border-gray-300 p-6 text-center"
    >
      <p className="mb-4 text-gray-600">{label}</p>
      <Button variant="outline" onClick={() => retry()}>
        Try again
      </Button>
      {process.env.NODE_ENV === "development" ? (
        <p className="mt-4 text-xs text-gray-400">
          {error instanceof Error ? error.message : String(error)}
        </p>
      ) : null}
    </div>
  );
}

export const CatalogErrorBoundary = catchError(CatalogErrorFallback);
