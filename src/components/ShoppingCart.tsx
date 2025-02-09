import Link from "next/link";
import { ShoppingCartIcon } from "lucide-react";
import { getUserSession } from "../actions/auth";

export default async function ShoppingCart() {
  const session = await getUserSession();

  return (
    <Link href="/cart" className="relative hover:text-gray-300">
      <ShoppingCartIcon className={session ? "text-green-300" : ""} />
      {session && session.cart && session.cart.items.length > 0 && (
        <span className="absolute -top-2 -right-2 bg-yellow-400 text-black rounded-full w-5 h-5 flex items-center justify-center text-xs">
          {session.cart.items.reduce((acc, item) => acc + item.quantity, 0)}
        </span>
      )}
    </Link>
  );
}
