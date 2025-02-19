"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { createContext, useContext, useState } from "react";

import { updateCart, getCart } from "@/actions/session";

import { MyUseMutationOptions, MyUseQueryOptions } from "../lib/query/client";

const CartContext = createContext<{
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}>({ isOpen: false, setIsOpen: () => {} });

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <CartContext.Provider value={{ isOpen, setIsOpen }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCartDisplay() {
  return useContext(CartContext);
}

export function useCart(options?: MyUseQueryOptions<typeof getCart>) {
  return useQuery({
    queryKey: ["cart"],
    queryFn: () => getCart(),
    ...options,
  });
}

export function useUpdateCart(
  options?: MyUseMutationOptions<typeof updateCart>,
) {
  return useMutation({
    mutationKey: ["updateCart"],
    mutationFn: ({ id, quantity }) => updateCart({ id, quantity }),
    ...options,
  });
}
