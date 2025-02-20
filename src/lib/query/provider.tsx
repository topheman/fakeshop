"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

import { CartProvider } from "@/hooks/cart";

import { makeQueryClient } from "./client";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => makeQueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <CartProvider>{children}</CartProvider>
      <ReactQueryDevtools />
    </QueryClientProvider>
  );
}
