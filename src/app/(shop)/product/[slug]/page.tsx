import Image from "next/image";
import { Suspense } from "react";

import { AddToCartButton } from "@/components/AddToCartButton";
import { PageContainer } from "@/components/Layout";
import { ProductCardLoading } from "@/components/ProductCardLoading";
import { getProduct } from "@/lib/api";
import { extractProductIdFromSlug } from "@/utils/slugUtils";

// Async child component
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

  const product = await getProduct(id);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2">
      <h1 className="mb-0 text-3xl font-bold text-primary md:col-span-2 md:mb-4">
        {product.title}
      </h1>
      <div>
        <Image
          src={product.thumbnail || "/placeholder.svg"}
          alt={product.title}
          width={500}
          height={500}
          className="h-auto w-full rounded-lg object-cover"
        />
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
