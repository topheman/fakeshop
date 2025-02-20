import Image from "next/image";

import { AddToCartButton } from "@/components/AddToCartButton";
import { getProduct } from "@/lib/api";
import { extractProductIdFromSlug } from "@/utils/slugUtils";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const id = extractProductIdFromSlug(slug);
  if (id === -1) {
    // Handle invalid slug
    return <div>Invalid product URL</div>;
  }
  const product = await getProduct(id);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
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
          <h1 className="mb-4 text-3xl font-bold text-primary">
            {product.title}
          </h1>
          <p className="mb-4 text-gray-600">{product.description}</p>
          <p className="mb-4 flex items-center justify-between text-2xl font-bold text-primary">
            <span>${product.price.toFixed(2)}</span>
            <AddToCartButton id={product.id} title={product.title} />
          </p>
        </div>
      </div>
    </div>
  );
}
