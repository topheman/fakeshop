import { Suspense } from "react";

import { PageContainer } from "@/components/Layout";
import { ProductGridLoading } from "@/components/ProductGridLoading";
import { RevealContent, RevealFallback } from "@/components/Reveal";
import { SearchResults } from "@/components/SearchResults";

// Async child component
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
      <SearchResults query={query} />
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
