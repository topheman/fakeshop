import type { ReactNode } from "react";
import { ViewTransition } from "react";

import { exceptNavigation } from "@/utils/viewTransitions";

/**
 * The two halves of a Suspense reveal. `RevealFallback` wraps the fallback and
 * `RevealContent` wraps the children of the same `<Suspense>`, so the
 * placeholder animates out as the real content animates in.
 *
 * They are a pair: the CSS keyframes are written so the enter is delayed until
 * the exit has finished, and using one without the other leaves half the
 * handoff unanimated. `default="none"` keeps them out of transitions they are
 * not part of, such as the product image morph nested inside them.
 */
export function RevealFallback({ children }: { children: ReactNode }) {
  return (
    <ViewTransition exit={exceptNavigation("slide-down")} default="none">
      {children}
    </ViewTransition>
  );
}

export function RevealContent({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter={exceptNavigation("slide-up")} default="none">
      {children}
    </ViewTransition>
  );
}
