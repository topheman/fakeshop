import { User } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { NAV_BACK } from "@/utils/viewTransitions";

import { SearchCombobox } from "./SearchCombobox";
import { SearchComboboxSkeleton } from "./SearchComboboxSkeleton";
import { ShoppingCart } from "./ShoppingCart";
import { UserIcon } from "./UserIcon";

export function Header({ mode }: { mode?: "shop" | "checkout" }) {
  return (
    // Snapshotted under its own name so the sliding page cannot paint over it.
    // The rules that hold that snapshot still are in `globals.css`.
    <header
      className="bg-primary p-2 text-white"
      style={{ viewTransitionName: "site-header" }}
    >
      <div className="container mx-auto flex items-center justify-between">
        <Link
          href="/"
          transitionTypes={NAV_BACK}
          className="flex flex-col text-lg font-bold leading-tight sm:flex-row sm:text-2xl sm:leading-normal"
        >
          <span>Fake</span>
          <span>Shop</span>
        </Link>
        <Suspense fallback={<SearchComboboxSkeleton />}>
          <SearchCombobox />
        </Suspense>
        <nav className="mr-[10px] mt-[10px]">
          <ul className="flex space-x-2 md:space-x-4">
            <li>
              <Suspense
                fallback={
                  <User data-prerender-hint="default icon prerendered" />
                }
              >
                <UserIcon />
              </Suspense>
            </li>
            <li className={mode === "checkout" ? "invisible" : ""}>
              <ShoppingCart />
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
