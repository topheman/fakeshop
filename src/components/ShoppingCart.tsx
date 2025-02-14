import { ShoppingCartIcon } from "lucide-react";
import Link from "next/link";

import { getUserSession } from "../actions/auth";

export default async function ShoppingCart() {
  const session = await getUserSession();

  return (
    <Link href="/cart" className="relative hover:text-gray-300">
      <ShoppingCartIcon className={session ? "text-green-300" : ""} />
      {session && session.cart && session.cart.items.length > 0 && (
        <span className="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full bg-yellow-400 text-xs text-black">
          {session.cart.items.reduce((acc, item) => acc + item.quantity, 0)}
        </span>
      )}
    </Link>
  );
}
