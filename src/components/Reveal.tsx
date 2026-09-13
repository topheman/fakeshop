import type { ReactNode } from "react";
import { ViewTransition } from "react";

/**
 * The two halves of a Suspense reveal. `RevealFallback` goes inside the
 * fallback and `RevealContent` inside the children of the same `<Suspense>`,
 * so the placeholder animates out as the real content animates in.
 *
 * They wrap the part of the page that is actually being swapped, not the whole
 * boundary: a title that is identical on both sides stays outside and holds its
 * place rather than sliding with the content. Each takes a single child, because
 * React drops the enter class when a boundary has to spread it over siblings.
 *
 * They are a pair: the CSS keyframes are written so the enter is delayed until
 * the exit has finished, and using one without the other leaves half the
 * handoff unanimated. `default="none"` keeps them out of transitions they are
 * not part of, such as the product image morph nested inside them.
 */
export function RevealFallback({ children }: { children: ReactNode }) {
  return (
    <ViewTransition exit="slide-down" default="none">
      {children}
    </ViewTransition>
  );
}

export function RevealContent({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter="slide-up" default="none">
      {children}
    </ViewTransition>
  );
}
