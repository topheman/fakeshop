import { cacheLife, cacheTag } from "next/cache";
import Image from "next/image";
import Link from "next/link";
import { Suspense, ViewTransition } from "react";

import { AddToCartButton } from "@/components/AddToCartButton";
import { CategoryIcon } from "@/components/CategoryIcon";
import { PageContainer } from "@/components/Layout";
import { ProductCardLoading } from "@/components/ProductCardLoading";
import { getProduct } from "@/lib/catalog";
import { IMAGE_BLUR_PLACEHOLDER } from "@/utils/constants";
import { extractProductIdFromSlug } from "@/utils/slugUtils";
import { productImageTransitionName } from "@/utils/viewTransitions";

/**
 * Reads `params`, which is request-time data. This is the cache boundary:
 * nothing above it can be cached, and everything below it is a pure function
 * of the product id.
 */
async function ProductContent({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  console.log("* ProductPage", { slug });
  const id = extractProductIdFromSlug(slug);

  if (id === -1) {
    // Handle invalid slug
    return <div>Invalid product URL</div>;
  }

  return <ProductDetail id={id} />;
}

/**
 * Caches the rendered output on top of the already-cached `getProduct`. The
 * two entries nest: this one holds the markup for a product, `getProduct`'s
 * holds the JSON that `/checkout` also reads. Both carry `product:${id}` so a
 * single invalidation reaches both.
 *
 * `AddToCartButton` is a Client Component passed straight through — a cached
 * scope stores the reference to it, not its behaviour, so the button stays
 * interactive.
 */
async function ProductDetail({ id }: { id: number }) {
  "use cache";
  cacheLife("hours");
  cacheTag("products", `product:${id}`);

  const product = await getProduct(id);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2">
      <h1 className="mb-0 flex items-center text-3xl font-bold text-primary md:col-span-2 md:mb-4">
        <span className="mr-2">{product.title}</span>
        <Link
          href={`/category/${product.category}`}
          title={`View all ${product.category} products`}
        >
          <CategoryIcon category={product.category} className="size-6" />
        </Link>
      </h1>
      <div>
        {/*
          The second half of the morph. The blur placeholder matters here: the
          hero is the destination the transition animates towards, and an
          <Image> that has not decoded yet paints nothing for it to land on.
        */}
        <ViewTransition
          name={productImageTransitionName(product.id)}
          share="morph"
          default="none"
        >
          <Image
            src={product.thumbnail || "/placeholder.svg"}
            placeholder="blur"
            blurDataURL={IMAGE_BLUR_PLACEHOLDER}
            alt={product.title}
            width={500}
            height={500}
            className="h-auto w-full rounded-lg object-cover"
          />
        </ViewTransition>
      </div>
      <div>
        <p className="mb-4 text-gray-600">{product.description}</p>
        <p className="mb-4 flex items-center justify-between text-2xl font-bold text-primary">
          <span>${product.price.toFixed(2)}</span>
          <AddToCartButton id={product.id} title={product.title} />
        </p>
      </div>
    </div>
  );
}

// Sync root component
export default function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <PageContainer>
      <Suspense fallback={<ProductCardLoading />}>
        <ProductContent params={params} />
      </Suspense>
    </PageContainer>
  );
}
