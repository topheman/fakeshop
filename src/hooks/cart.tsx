"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useState } from "react";

import { updateCart, getCart } from "@/actions/session";

import { MyUseMutationOptions, MyUseQueryOptions } from "../lib/query/client";
import { prepareCart } from "../utils/cart";

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
    // server action can't be aborted 🥲 - https://github.com/facebook/react/issues/28511
    mutationFn: ({ id, quantity }) => updateCart({ id, quantity }),
    ...options,
  });
}

export function useUpdateOptimisticCart(
  options?: MyUseMutationOptions<typeof updateCart>,
) {
  const queryClient = useQueryClient();
  const updateCartMutation = useUpdateCart();
  const { data: cart } = useCart();

  return useMutation({
    mutationKey: ["updateCartOptimistic"],
    mutationFn: async ({ id, quantity }) => {
      if (cart) {
        const optimisticCart = prepareCart({ cart, id, quantity });
        queryClient.setQueryData(["cart"], optimisticCart);
      }
      const updatedCart = await updateCartMutation.mutateAsync({
        id,
        quantity,
      });
      queryClient.setQueryData(["cart"], updatedCart);
      return updatedCart;
    },
    ...options,
  });
}
