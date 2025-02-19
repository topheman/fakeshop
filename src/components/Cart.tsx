"use client";

import { useCartDisplay } from "@/hooks/cart";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "./ui/sheet";

export function Cart() {
  const { isOpen, setIsOpen } = useCartDisplay();

  return (
    <Sheet open={isOpen} onOpenChange={() => setIsOpen(!isOpen)}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Cart</SheetTitle>
          <SheetDescription>The cart is empty.</SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  );
}
