"use client";

import { RouteError } from "@/components/RouteError";

/**
 * Scoped to the `(shop)` group, not to `src/app/`. An `error.tsx` wraps the
 * pages and nested layouts *below* it but never the `layout.tsx` sitting next
 * to it, so from here the header, the cart sheet and the footer keep rendering
 * and only the page content is replaced. At `src/app/` the boundary would sit
 * above `(shop)/layout.tsx` and take the whole chrome down with it.
 */
export default function ShopError({
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
      title="This page could not be loaded"
      description="The product catalog is not answering right now. This is usually temporary."
    />
  );
}
