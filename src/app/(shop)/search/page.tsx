import { Suspense, ViewTransition } from "react";

import { PageContainer } from "@/components/Layout";
import { ProductGridLoading } from "@/components/ProductGridLoading";
import { RevealContent, RevealFallback } from "@/components/Reveal";
import { SearchResults } from "@/components/SearchResults";

/**
 * Reads `searchParams`, which is request-time data, so it sits inside the
 * `<Suspense>` boundary and keeps the shell above it independent of the query.
 *
 * `/search?q=a` to `/search?q=b` is the only same-route navigation the UI can
 * reach: `SearchCombobox` pushes it when it is already on this page. A
 * directional slide would be the wrong signal there — nothing moved through the
 * hierarchy, the same container is showing different contents — so the results
 * crossfade instead. The `key` is what makes it a transition at all: without
 * it React updates the grid in place and there is no old/new pair to animate.
 */
async function SearchContent({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const q = params.q;
  const query = typeof q === "string" ? q : "";

  return (
    <>
      <h1 className="mb-4 text-3xl font-bold text-primary">
        {query ? `Search Results for "${query}"` : "Search Products"}
      </h1>
      <ViewTransition
        key={query}
        name="search-results"
        share="auto"
        enter="auto"
        default="none"
      >
        <SearchResults query={query} />
      </ViewTransition>
    </>
  );
}

// Sync root component
export default function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return (
    <PageContainer>
      <Suspense
        fallback={
          <RevealFallback>
            <ProductGridLoading />
          </RevealFallback>
        }
      >
        <RevealContent>
          <SearchContent searchParams={searchParams} />
        </RevealContent>
      </Suspense>
    </PageContainer>
  );
}
