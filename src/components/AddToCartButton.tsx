"use client";

import { ShoppingCartIcon } from "lucide-react";
import { useCallback, type MouseEvent } from "react";

import { useUpdateOptimisticCart, useCartDisplay } from "@/hooks/cart";

import { Button } from "./ui/button";

export function AddToCartButton({
  id,
  title,
  variant = "default",
}: {
  id: number;
  title?: string;
  variant?: "default" | "small";
}) {
  const updateCartOptimistic = useUpdateOptimisticCart();
  const { setIsOpen } = useCartDisplay();
  const handleAddToCart = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      updateCartOptimistic.mutate({ id, quantity: undefined });
      setIsOpen(true);
    },
    [id, updateCartOptimistic, setIsOpen],
  );

  const finalTitle = title ? `Add "${title}" to Cart` : "Add to Cart";

  if (variant === "default") {
    return (
      <Button title={finalTitle} onClick={handleAddToCart} type="button">
        <ShoppingCartIcon className="mr-2 size-4" strokeWidth={3} />
        Add to Cart
      </Button>
    );
  }
  return (
    <Button title={finalTitle} onClick={handleAddToCart} type="button">
      <ShoppingCartIcon className="size-5" strokeWidth={3} />
    </Button>
  );
}
