import Link from "next/link";
import { User } from "lucide-react";
import SearchCombobox from "./SearchCombobox";
import ShoppingCart from "./ShoppingCart";
import { Suspense } from "react";

export default function Header() {
  return (
    <header className="bg-[#900000] text-white p-4">
      <div className="container mx-auto flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold">
          FakeStore
        </Link>
        <Suspense fallback={<div>Loading...</div>}>
          <SearchCombobox />
        </Suspense>
        <nav>
          <ul className="flex space-x-4">
            <li>
              <Link href="/categories" className="hover:text-gray-300">
                Categories
              </Link>
            </li>
            <li>
              <Link href="/account" className="hover:text-gray-300">
                <User />
              </Link>
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
