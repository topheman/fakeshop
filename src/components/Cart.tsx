"use client";

import { useCartDisplay } from "@/hooks/cart";
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
