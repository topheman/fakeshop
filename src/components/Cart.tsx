"use client";

import { useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import Image from "next/image";

import { useCart, useCartDisplay, useUpdateCart } from "@/hooks/cart";
import { useProductsByIds } from "@/hooks/products";
import { useIsMobile } from "@/hooks/utils";
import type { Product } from "@/lib/api";
import { prepareCart } from "@/utils/cart";

import { Button } from "./ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "./ui/sheet";

export function Cart() {
  const { isOpen, setIsOpen } = useCartDisplay();
  const isMobile = useIsMobile();
  const { data: cart } = useCart();
  const productQueries = useProductsByIds(
    cart?.items.map((item) => item.id) ?? [],
  );
  const updateCart = useUpdateCart();
  const queryClient = useQueryClient();

  async function handleUpdateCart(id: number, quantity: number) {
    if (cart) {
      const optimisticCart = prepareCart({ cart, id, quantity });
      queryClient.setQueryData(["cart"], optimisticCart);
    }
    const updatedCart = await updateCart.mutateAsync({ id, quantity });
    queryClient.setQueryData(["cart"], updatedCart);
  }

  const cartItems = cart?.items ?? [];
  const products = productQueries
    .map((query) => query.data)
    .filter((product): product is Product => Boolean(product));

  const subtotal = products.reduce((total, product, index) => {
    const quantity = cartItems[index]?.quantity ?? 0;
    return total + product.price * quantity;
  }, 0);

  return (
    <Sheet open={isOpen} onOpenChange={() => setIsOpen(!isOpen)}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className="flex flex-col"
      >
        <SheetHeader className="space-y-4 pr-6">
          <SheetTitle>My Cart</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {cartItems.length === 0 ? (
            <p className="text-center text-muted-foreground">
              Your cart is empty
            </p>
          ) : (
            <div className="max-h-[calc(100vh-400px)] space-y-4 overflow-y-auto md:max-h-[unset]">
              {products.map((product, index) => {
                const item = cartItems[index];
                if (!item) return null;

                return (
                  <div
                    key={product.id}
                    className="flex items-center gap-4 border-b pb-4"
                  >
                    <div className="relative size-20 overflow-hidden rounded-md">
                      <Image
                        src={product.thumbnail}
                        alt={product.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex flex-1 flex-col">
                      <h3 className="font-medium">{product.title}</h3>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-8"
                            onClick={() =>
                              handleUpdateCart(product.id, item.quantity - 1)
                            }
                          >
                            -
                          </Button>
                          <span className="w-8 text-center">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-8"
                            onClick={() =>
                              handleUpdateCart(product.id, item.quantity + 1)
                            }
                          >
                            +
                          </Button>
                        </div>
                        <span className="font-medium">
                          ${(product.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="size-8">
                      <X className="size-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <SheetFooter className="border-t pt-4">
          <div className="w-full space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Subtotal</span>
              <span className="font-medium">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Shipping</span>
              <span>Calculated at checkout</span>
            </div>
            <Button
              className="w-full text-white"
              disabled={cartItems.length === 0}
            >
              Proceed to Checkout
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
