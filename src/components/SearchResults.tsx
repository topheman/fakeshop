import { cacheLife, cacheTag } from "next/cache";

import { searchProducts } from "@/lib/catalog";
import type { Product } from "@/types";

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
        <SearchResultsFor query={query} />
      ) : (
        <p>Use the search box above to find products.</p>
      )}
    </div>
  );
}

async function SearchResultsFor({ query }: { query: string }) {
  "use cache";
  cacheTag("products");

  let results: Product[] = [];
  try {
    const searchResults = await searchProducts(query);
    results = searchResults.products;
  } catch (error) {
    console.error("Error fetching search results:", error);
    // This branch used to fall through to "No products found", so a network
    // failure rendered as an empty result set. Harmless when nothing was
    // cached; caching it for an hour would turn a blip into a lie.
    cacheLife("seconds");
    return <p>Search is unavailable right now. Please try again.</p>;
  }
  cacheLife("hours");

  return results.length > 0 ? (
    <ProductGrid products={results} />
  ) : (
    <p>No products found for "{query}"</p>
  );
}
