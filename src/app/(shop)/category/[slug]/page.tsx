import { cacheLife, cacheTag } from "next/cache";
import { Suspense } from "react";

import { CatalogErrorBoundary } from "@/components/CatalogErrorBoundary";
import { CategoryIcon } from "@/components/CategoryIcon";
import { PageContainer } from "@/components/Layout";
import { ProductGrid } from "@/components/ProductGrid";
import { ProductGridLoading } from "@/components/ProductGridLoading";
import { RevealContent } from "@/components/Reveal";
import { getProductsByCategory } from "@/lib/catalog";
import { slugToDisplayName } from "@/utils/slugUtils";

/**
 * Reads `params`, which is request-time data. This is the cache boundary:
 * nothing above it can be cached, and everything below it is a pure function
 * of `slug`.
 *
 * The heading is rendered here rather than inside the cached component below.
 * It is pure string work on a slug we already have — no I/O, cheaper to render
 * than to look up — and keeping it outside that boundary is the whole point of
 * a component-level fallback: when the catalog is down the visitor still sees
 * which category they asked for.
 */
async function CategoryContent({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  console.log("* CategoryPage", { slug });

  return (
    <>
      <h1 className="mb-8 flex items-center text-3xl font-bold text-primary">
        <CategoryIcon category={slug} className="mr-2 size-6 shrink-0" />
        <span>{slugToDisplayName(slug)}</span>
      </h1>
      <RevealContent>
        <CatalogErrorBoundary label="These products could not be loaded.">
          <CategoryProducts slug={slug} />
        </CatalogErrorBoundary>
      </RevealContent>
    </>
  );
}

/**
 * Caches the rendered output, not just the fetch underneath it.
 *
 * It carries the same tags as `getProductsByCategory` on purpose. A cached
 * component holds the result of the whole subtree, so invalidating only the
 * data entry would leave this one serving the old markup — an outer scope with
 * an explicit `cacheLife` never re-reads an inner one until its own entry goes.
 *
 * The read is deliberately not wrapped in a try/catch. A failure rendered as a
 * return value is a cacheable value, and would be served for the whole
 * `cacheLife`; a `use cache` scope that rejects writes no entry at all. Letting
 * it throw is what lets the boundary above turn the failure into UI that can
 * retry.
 */
async function CategoryProducts({ slug }: { slug: string }) {
  "use cache";
  cacheLife("hours");
  cacheTag("products", `category:${slug}`);

  const { products } = await getProductsByCategory(slug);

  return products.length > 0 ? (
    <ProductGrid products={products} />
  ) : (
    <p>No products found in this category.</p>
  );
}

// Sync root component
export default function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <PageContainer>
      <Suspense fallback={<ProductGridLoading />}>
        <CategoryContent params={params} />
      </Suspense>
    </PageContainer>
  );
}
