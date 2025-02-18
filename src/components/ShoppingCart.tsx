import { ShoppingCartIcon } from "lucide-react";
import Link from "next/link";

import { getCart } from "../actions/session";

export default async function ShoppingCart() {
  const cart = await getCart();

  return (
    <Link href="/cart" className="relative hover:text-gray-300">
      <ShoppingCartIcon className={cart ? "text-green-300" : ""} />
      {cart && cart.items.length > 0 && (
        <span className="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full bg-yellow-400 text-xs text-black">
          {cart.items.reduce((acc, item) => acc + item.quantity, 0)}
        </span>
      )}
    </Link>
  );
}
