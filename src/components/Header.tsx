import { User } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import SearchCombobox from "./SearchCombobox";
import ShoppingCart from "./ShoppingCart";

export default function Header() {
  return (
    <header className="bg-primary p-4 text-white">
      <div className="container mx-auto flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold">
          FakeShop
        </Link>
        <Suspense fallback={<div>Loading...</div>}>
          <SearchCombobox />
        </Suspense>
        <nav>
          <ul className="flex space-x-4">
            <li>
              <Link href="/account" className="hover:text-gray-300">
                <User />
              </Link>
            </li>
            <li>
              <Suspense fallback={<div>Loading...</div>}>
                <ShoppingCart />
              </Suspense>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
