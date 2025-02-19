import { cache } from "react";

const BASE_URL = "https://dummyjson.com";

export interface Product {
  id: number;
  title: string;
  description: string;
  price: number;
  discountPercentage: number;
  rating: number;
  stock: number;
  brand: string;
  category: string;
  thumbnail: string;
  images: string[];
}

export interface SearchResult {
  products: Product[];
  total: number;
  skip: number;
  limit: number;
}

export interface Category {
  slug: string;
  name: string;
  url: string;
}

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`, options);
  if (!res.ok) {
    throw new Error(`API request failed: ${res.statusText}`);
  }
  return res.json();
}

export const getCategories = cache(
  async (): Promise<{ slug: string; name: string }[]> => {
    const categories = await fetchApi<Category[]>("/products/categories");
    return categories.map(({ slug, name }) => ({
      slug,
      name,
    }));
  },
);

export const getProducts = cache(
  async (limit = 10, skip = 0): Promise<SearchResult> => {
    return fetchApi<SearchResult>(`/products?limit=${limit}&skip=${skip}`);
  },
);

export const searchProducts = cache(
  async (
    query: string,
    { limit = 5 }: { limit?: number } = {},
  ): Promise<SearchResult> => {
    return fetchApi<SearchResult>(
      `/products/search?q=${encodeURIComponent(query)}&limit=${limit}`,
    );
  },
);

export const getProduct = cache(async (id: number): Promise<Product> => {
  return fetchApi<Product>(`/products/${id}`);
});

export const getProductsByCategory = cache(
  async (category: string, limit = 10, skip = 0): Promise<SearchResult> => {
    return fetchApi<SearchResult>(
      `/products/category/${encodeURIComponent(category)}?limit=${limit}&skip=${skip}`,
    );
  },
);
