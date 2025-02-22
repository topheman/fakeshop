import Image from "next/image";
import Link from "next/link";

import type { Product } from "@/lib/api";
import { generateProductSlug } from "@/utils/slugUtils";

import { AddToCartButton } from "./AddToCartButton";

export default function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <Link
          key={product.id}
          href={`/product/${generateProductSlug(product.title, product.id)}`}
          className="block rounded-lg border p-4 transition-shadow hover:shadow-lg"
        >
          <div className="w-full overflow-hidden rounded-lg bg-gray-200">
            <Image
              src={product.thumbnail}
              blurDataURL="/placeholder.svg"
              alt={product.title}
              width={200}
              height={200}
              className="size-full object-cover object-center"
            />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-gray-700">
            {product.title}
          </h2>
          <p className="mt-1 flex items-center justify-between text-lg font-medium text-gray-900">
            <span>${product.price.toFixed(2)}</span>
            <AddToCartButton
              id={product.id}
              title={product.title}
              variant="small"
            />
          </p>
        </Link>
      ))}
    </div>
  );
}
