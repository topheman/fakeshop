import { cacheLife, cacheTag } from "next/cache";

import * as api from "./api";
import type { Product, SearchResult } from "./api";

/**
 * The cached read layer over `./api`.
 *
 * `./api` is the transport and is isomorphic: `src/hooks/products.ts` imports
 * it from the browser through TanStack Query. That is why the caching lives
 * here instead. Importing `next/cache` from a module that reaches the client
 * bundle is a build error, so this file cannot accidentally be imported by a
 * Client Component — the import is the guard, no `server-only` package needed.
 *
 * Server Components should read the catalog through this module; only the
 * browser should call `./api` directly.
 *
 * Every cached function below takes required arguments, and the defaults live
 * in the exported wrapper in front of it. A cache key is built from the
 * arguments *as passed*, before parameter defaults are applied, so a default
 * inside a `use cache` scope means `f("x")` and `f("x", 10, 0)` are two
 * entries holding the same value. Measured, not assumed.
 */

/**
 * Categories are the shop's structure, not its content. They change when
 * someone restructures the catalog, which in practice is a deploy — and a
 * deploy invalidates every entry anyway, because the build ID is part of the
 * cache key.
 */
export async function getCategories(): Promise<
  { slug: string; name: string }[]
> {
  "use cache";
  cacheLife("max");
  cacheTag("categories");
  return api.getCategories();
}

/**
 * `hours` rather than `max` because a product's price and stock are the parts
 * of a catalog that genuinely move during a day. dummyjson never changes, so
 * `max` would be honest for this app specifically, but the profile is here to
 * describe the data, not the fixture behind it.
 *
 * The per-product tag lets one product be invalidated without dropping the
 * whole catalog. Nothing in this app calls `revalidateTag` yet — dummyjson is
 * read-only, so there is no mutation to hang it off. The tags are declared so
 * the surface exists for whenever a real backend does.
 */
export async function getProduct(id: number): Promise<Product> {
  "use cache";
  cacheLife("hours");
  cacheTag("products", `product:${id}`);
  return api.getProduct(id);
}

export function getProductsByCategory(
  category: string,
  limit = 10,
  skip = 0,
): Promise<SearchResult> {
  return cachedProductsByCategory(category, limit, skip);
}

async function cachedProductsByCategory(
  category: string,
  limit: number,
  skip: number,
): Promise<SearchResult> {
  "use cache";
  cacheLife("hours");
  cacheTag("products", `category:${category}`);
  return api.getProductsByCategory(category, limit, skip);
}

/**
 * `query` comes from `searchParams`, so it is runtime data passed in as an
 * argument — the pattern `use cache` exists for. The cost is that the key space
 * is whatever visitors type: every distinct query is its own entry in a bounded
 * in-memory LRU, so rare queries evict each other and only popular ones stay
 * warm. That is the right trade here, but it is a trade.
 */
export function searchProducts(
  query: string,
  { limit = 5 }: { limit?: number } = {},
): Promise<SearchResult> {
  return cachedSearchProducts(query, limit);
}

async function cachedSearchProducts(
  query: string,
  limit: number,
): Promise<SearchResult> {
  "use cache";
  cacheLife("hours");
  cacheTag("products");
  return api.searchProducts(query, { limit });
}
