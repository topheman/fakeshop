import { ViewTransition } from "react";

import { cn } from "@/lib/utils";

import { Cart } from "./Cart";
import Footer from "./Footer";
import { Header } from "./Header";

export function Layout({
  children,
  mode = "shop",
}: {
  children: React.ReactNode;
  mode?: "shop" | "checkout";
}) {
  return (
    <>
      <Header mode={mode} />
      {mode === "shop" && <Cart />}
      <main className="mx-auto w-full max-w-screen-xl grow bg-background">
        {children}
      </main>
      <Footer />
    </>
  );
}

/**
 * The box every page renders its content into, and the reason a navigation
 * animates at all: React only calls `document.startViewTransition` when a
 * `<ViewTransition>` is part of the update, so without one here a tagged link
 * would change the page with no transition for the CSS to hook into.
 *
 * `default="none"` is doing real work. It starts the transition without giving
 * this element a `view-transition-name`, which keeps the page inside the root
 * snapshot — and the root is what the directional slide in `globals.css`
 * animates. Naming it instead would cut the page out of that snapshot and leave
 * a hole where the sliding content should be.
 */
export function PageContainer({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <ViewTransition default="none">
      <div className={cn("container mx-auto px-4 py-8", className)}>
        {children}
      </div>
    </ViewTransition>
  );
}
