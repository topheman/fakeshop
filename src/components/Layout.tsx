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
 * animates: React only starts a view transition when a `<ViewTransition>` is
 * part of the update.
 *
 * The name has to be here rather than on `root`, which React cancels outright
 * whenever no boundary activates. A single stable name is also what pairs the
 * outgoing and incoming pages into one snapshot pair instead of two.
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
