import { Suspense } from "react";

import { PageContainer } from "@/components/Layout";
import { ProductGridLoading } from "@/components/ProductGridLoading";
import { RevealContent } from "@/components/Reveal";
import { SearchResults } from "@/components/SearchResults";

/**
 * Reads `searchParams`, which is request-time data, so it sits inside the
 * `<Suspense>` boundary and keeps the shell above it independent of the query.
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
      <RevealContent>
        <SearchResults query={query} />
      </RevealContent>
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
      <Suspense fallback={<ProductGridLoading />}>
        <SearchContent searchParams={searchParams} />
      </Suspense>
    </PageContainer>
  );
}
