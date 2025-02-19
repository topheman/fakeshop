import Link from "next/link";
import { Suspense } from "react";

import SearchCombobox from "./SearchCombobox";
import ShoppingCart from "./ShoppingCart";
import UserIcon from "./UserIcon";

export default function Header() {
  return (
    <header className="bg-primary p-2 text-white">
      <div className="container mx-auto flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold">
          FakeShop
        </Link>
        <Suspense fallback={<div>Loading...</div>}>
          <SearchCombobox />
        </Suspense>
        <nav className="-mb-2 pt-1">
          <ul className="-mr-1 flex space-x-2 md:space-x-4">
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
