import Link from "next/link";
import { Suspense } from "react";

import SearchCombobox from "./SearchCombobox";
import ShoppingCart from "./ShoppingCart";
import UserIcon from "./UserIcon";

export default function Header() {
  return (
    <header className="bg-primary p-2 text-white">
      <div className="container mx-auto flex items-center justify-between">
        <Link
          href="/"
          className="flex flex-col text-lg font-bold leading-tight sm:flex-row sm:text-2xl sm:leading-normal"
        >
          <span>Fake</span>
          <span>Shop</span>
        </Link>
        <Suspense fallback={<div>Loading...</div>}>
          <SearchCombobox />
        </Suspense>
        <nav className="mr-[10px] mt-[10px]">
          <ul className="flex space-x-2 md:space-x-4">
            <li>
              <Suspense fallback={<div>Loading...</div>}>
                <UserIcon />
              </Suspense>
            </li>
            <li>
              <ShoppingCart />
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
