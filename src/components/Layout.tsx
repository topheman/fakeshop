import { ViewTransition } from "react";

import { cn } from "@/lib/utils";
import { NAV_DIRECTION } from "@/utils/viewTransitions";

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
 * Every page renders this, and nothing else does, which is what makes it the
 * right place for the directional slide. A layout persists across a navigation
 * so its `enter` and `exit` never fire; a component the page itself mounts is
 * unmounted and remounted on every route change, which is exactly the pair the
 * transition needs.
 */
export function PageContainer({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <ViewTransition enter={NAV_DIRECTION} exit={NAV_DIRECTION} default="none">
      <div className={cn("container mx-auto px-4 py-8", className)}>
        {children}
      </div>
    </ViewTransition>
  );
}
