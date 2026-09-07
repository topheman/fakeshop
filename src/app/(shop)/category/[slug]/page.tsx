import { cacheLife, cacheTag } from "next/cache";
import { Suspense } from "react";

import { CatalogErrorBoundary } from "@/components/CatalogErrorBoundary";
import { CategoryIcon } from "@/components/CategoryIcon";
import { PageContainer } from "@/components/Layout";
import { ProductGrid } from "@/components/ProductGrid";
import { ProductGridLoading } from "@/components/ProductGridLoading";
import { getProductsByCategory } from "@/lib/catalog";
import { slugToDisplayName } from "@/utils/slugUtils";

/**
 * Reads `params`, which is request-time data. This is the cache boundary:
 * nothing above it can be cached, and everything below it is a pure function
 * of `slug`.
 *
 * The heading moved up out of the cached component in phase 5. It is pure
 * string work on a slug we already have — no I/O, cheaper to render than to
 * look up — and keeping it outside the boundary is the whole point of a
 * component-level fallback: when the catalog is down the visitor still sees
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
        <span className="mr-2">{slugToDisplayName(slug)}</span>
        <CategoryIcon category={slug} className="size-6" />
      </h1>
      <CatalogErrorBoundary label="These products could not be loaded.">
        <CategoryProducts slug={slug} />
      </CatalogErrorBoundary>
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
 * Phase 4 wrapped the read in a try/catch that rendered a paragraph and
 * downgraded the scope to `cacheLife("seconds")`, because a failure rendered as
 * a return value is a cacheable value. Phase 5 lets the error throw instead: a
 * `use cache` scope that rejects writes no entry at all, so there is no failure
 * lifetime left to choose, and the boundary above turns the throw into UI that
 * can retry.
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
