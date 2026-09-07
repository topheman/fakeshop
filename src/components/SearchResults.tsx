import { cacheLife, cacheTag } from "next/cache";

import { searchProducts } from "@/lib/catalog";

import { CatalogErrorBoundary } from "./CatalogErrorBoundary";
import { ProductGrid } from "./ProductGrid";

/**
 * `query` arrives from `searchParams`, so it is request-time data. Passing it
 * down as an argument is what lets the subtree below be cached at all: the
 * cached scope never touches `searchParams` itself, it just receives a string.
 */
export async function SearchResults({ query }: { query: string }) {
  return (
    <div>
      {query ? (
        <CatalogErrorBoundary label="Search is unavailable right now.">
          <SearchResultsFor query={query} />
        </CatalogErrorBoundary>
      ) : (
        <p>Use the search box above to find products.</p>
      )}
    </div>
  );
}

/**
 * The try/catch here used to fall through to "No products found", so a network
 * failure rendered as an empty result set — a wrong answer cached like a right
 * one. Phase 4 fixed the message and gave the failure branch a short
 * `cacheLife`; phase 5 removes the branch entirely and lets the boundary above
 * handle it, because a rejected `use cache` scope is never written to the
 * cache in the first place.
 */
async function SearchResultsFor({ query }: { query: string }) {
  "use cache";
  cacheLife("hours");
  cacheTag("products");

  const { products } = await searchProducts(query);

  return products.length > 0 ? (
    <ProductGrid products={products} />
  ) : (
    <p>No products found for "{query}"</p>
  );
}
