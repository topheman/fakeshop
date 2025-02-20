"use client";

import { X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { useCart, useCartDisplay, useUpdateOptimisticCart } from "@/hooks/cart";
import { useProductsByIds } from "@/hooks/products";
import { useIsMobile } from "@/hooks/utils";
import type { Product } from "@/lib/api";
import { cn } from "@/lib/utils";

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
  const updateCartOptimistic = useUpdateOptimisticCart();

  async function handleUpdateCart(id: number, quantity: number | null) {
    updateCartOptimistic.mutate({ id, quantity });
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
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => handleUpdateCart(product.id, null)}
                    >
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
            <Link
              href="/checkout"
              onClick={() => {
                setIsOpen(false);
              }}
              className={cn(
                "inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                cartItems.length === 0 && "pointer-events-none opacity-50",
              )}
            >
              Proceed to Checkout
            </Link>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
