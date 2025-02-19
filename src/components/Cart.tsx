"use client";

import { useCart, useCartDisplay } from "@/hooks/cart";
import { useProductsByIds } from "@/hooks/products";
import { useIsMobile } from "@/hooks/utils";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "./ui/sheet";

export function Cart() {
  const { isOpen, setIsOpen } = useCartDisplay();
  const isMobile = useIsMobile();
  const { data: cart } = useCart();
  const result = useProductsByIds(cart?.items.map((item) => item.id) ?? []);
  console.log(result);

  return (
    <Sheet open={isOpen} onOpenChange={() => setIsOpen(!isOpen)}>
      <SheetContent side={isMobile ? "bottom" : "right"}>
        <SheetHeader>
          <SheetTitle>Cart</SheetTitle>
          <SheetDescription>The cart is empty.</SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  );
}
