"use client";

import Link from "next/link";
import { ShoppingCartIcon } from "lucide-react";
import { useUserSession } from "../hooks/session";

export default function ShoppingCart() {
  const { userSession } = useUserSession();

  return (
    <Link href="/cart" className="relative hover:text-gray-300">
      <ShoppingCartIcon className={userSession ? "text-green-300" : ""} />
      {userSession && userSession.cart && userSession.cart.items.length > 0 && (
        <span className="absolute -top-2 -right-2 bg-yellow-400 text-black rounded-full w-5 h-5 flex items-center justify-center text-xs">
          {userSession.cart.items.reduce((acc, item) => acc + item.quantity, 0)}
        </span>
      )}
    </Link>
  );
}
