import { searchProducts } from "@/lib/api";
import type { Product } from "@/types";

import ProductGrid from "./ProductGrid";

export default async function SearchResults({
  query: initialQuery,
}: {
  query: string;
}) {
  let results: Product[] = [];
  const query = initialQuery;

  if (query) {
    try {
      const searchResults = await searchProducts(query);
      results = searchResults.products;
    } catch (error) {
      console.error("Error fetching search results:", error);
    }
  }

  return (
    <div>
      {query ? (
        results.length > 0 ? (
          <ProductGrid products={results} />
        ) : (
          <p>No products found for "{query}"</p>
        )
      ) : (
        <p>Use the search box above to find products.</p>
      )}
    </div>
  );
}
