"use client";

import { ShoppingCartIcon } from "lucide-react";

import { useCart, useCartDisplay } from "@/hooks/cart";

export function ShoppingCart() {
  const cart = useCart();
  const { setIsOpen } = useCartDisplay();

  return (
    <button
      type="button"
      className="relative hover:text-gray-300"
      onClick={() => setIsOpen(true)}
    >
      <ShoppingCartIcon strokeWidth={cart ? 2.8 : 2} />
      {cart.data && cart.data.items.length > 0 && (
        <span className="absolute -right-3 -top-3 flex size-6 items-center justify-center rounded-full bg-white text-xs text-black">
          {cart.data.items.reduce((acc, item) => acc + item.quantity, 0)}
        </span>
      )}
    </button>
  );
}
