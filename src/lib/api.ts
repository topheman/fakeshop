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
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    /**
     * The data is static, so we can cache it indefinitely.
     * In a real project, you would use some redis cache and
     * a revalidation strategy like stale-while-revalidate.
     *
     * This is a nextjs specific option. - https://nextjs.org/docs/app/api-reference/functions/fetch
     */
    cache: "force-cache",
    ...options,
  });
  if (!res.ok) {
    throw new Error(`API request failed: ${res.statusText}`);
  }
  return res.json();
}

export const getCategories = async (): Promise<
  { slug: string; name: string }[]
> => {
  console.log("  > getCategories");
  const categories = await fetchApi<Category[]>("/products/categories");
  return categories.map(({ slug, name }) => ({
    slug,
    name,
  }));
};

export const getProducts = async (
  limit = 10,
  skip = 0,
): Promise<SearchResult> => {
  console.log("  > getProducts", { limit, skip });
  return fetchApi<SearchResult>(`/products?limit=${limit}&skip=${skip}`);
};

export const searchProducts = async (
  query: string,
  { limit = 5 }: { limit?: number } = {},
): Promise<SearchResult> => {
  console.log("  > searchProducts", { query, limit });
  return fetchApi<SearchResult>(
    `/products/search?q=${encodeURIComponent(query)}&limit=${limit}`,
  );
};

export const getProduct = async (id: number): Promise<Product> => {
  console.log("  > getProduct", { id });
  return fetchApi<Product>(`/products/${id}`);
};

export const getProductsByCategory = async (
  category: string,
  limit = 10,
  skip = 0,
): Promise<SearchResult> => {
  console.log("  > getProductsByCategory", { category, limit, skip });
  return fetchApi<SearchResult>(
    `/products/category/${encodeURIComponent(category)}?limit=${limit}&skip=${skip}`,
  );
};
