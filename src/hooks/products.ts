import { useQueries, useQuery } from "@tanstack/react-query";

import { getProduct, getProducts, searchProducts } from "@/lib/api";
import { MyUseQueryOptions } from "@/lib/query/client";

export function useProducts(
  { limit = 10, skip = 0 }: { limit?: number; skip?: number } = {},
  options?: MyUseQueryOptions<typeof getProducts>,
) {
  return useQuery({
    queryKey: ["products-list", { limit, skip }],
    queryFn: () => getProducts(limit, skip),
    ...options,
  });
}

export function useSearchProducts(
  {
    query,
    limit = 5,
  }: {
    query: string;
    limit?: number;
  },
  options?: MyUseQueryOptions<typeof searchProducts>,
) {
  return useQuery({
    queryKey: ["products-search", query, { limit }],
    queryFn: () => searchProducts(query, { limit }),
    ...options,
  });
}

export function useProduct(
  id: number,
  options?: MyUseQueryOptions<typeof getProduct>,
) {
  return useQuery({
    queryKey: ["product", id],
    queryFn: () => getProduct(id),
    ...options,
  });
}

export function useProductsByIds(ids: number[]) {
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: ["product", id],
      queryFn: () => getProduct(id),
      enabled: !!id,
    })),
  });
}
