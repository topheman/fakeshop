import { getProduct, getProducts, searchProducts } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

export function useProducts({
  limit = 10,
  skip = 0,
}: { limit?: number; skip?: number } = {}) {
  return useQuery({
    queryKey: ["products-list", { limit, skip }],
    queryFn: () => getProducts(limit, skip),
  });
}

export function useSearchProducts(query: string) {
  return useQuery({
    queryKey: ["products-search", query],
    queryFn: () => searchProducts(query),
  });
}

export function useProduct(id: number) {
  return useQuery({
    queryKey: ["product", id],
    queryFn: () => getProduct(id),
  });
}
