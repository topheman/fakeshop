"use client";

import { ShoppingCartIcon } from "lucide-react";

import { useCart, useCartDisplay } from "@/hooks/cart";

export default function ShoppingCart() {
  const cart = useCart();
  const { setIsOpen } = useCartDisplay();

  return (
    <button
      type="button"
      className="relative hover:text-gray-300"
      onClick={() => setIsOpen(true)}
    >
      <ShoppingCartIcon className={cart ? "text-green-300" : ""} />
      {cart.data && cart.data.items.length > 0 && (
        <span className="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full bg-yellow-400 text-xs text-black">
          {cart.data.items.reduce((acc, item) => acc + item.quantity, 0)}
        </span>
      )}
    </button>
  );
}
