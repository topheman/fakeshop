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
 * `<ViewTransition>` is part of the update.
 *
 * The name has to be here rather than on the document root. React cancels the
 * root snapshot outright — it sets `view-transition-name: none` on `<html>` and
 * pins `::view-transition-group(root)` to `opacity: 0` — whenever no boundary
 * activates, so CSS written against `root` never paints. A boundary React keeps
 * is the only surface available, and a stable name is what guarantees the
 * outgoing and incoming pages form a single old/new pair instead of two
 * independent ones.
 */
export function PageContainer({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <ViewTransition name="page">
      <div className={cn("container mx-auto px-4 py-8", className)}>
        {children}
      </div>
    </ViewTransition>
  );
}
