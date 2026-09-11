import Image from "next/image";
import Link from "next/link";
import { ViewTransition } from "react";

import type { Product } from "@/lib/api";
import { IMAGE_BLUR_PLACEHOLDER } from "@/utils/constants";
import { generateProductSlug } from "@/utils/slugUtils";
import { productImageTransitionName } from "@/utils/viewTransitions";

import { AddToCartButton } from "./AddToCartButton";

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <Link
          key={product.id}
          href={`/product/${generateProductSlug(product.title, product.id)}`}
          className="block rounded-lg border p-4 transition-shadow hover:shadow-lg"
        >
          <div className="w-full overflow-hidden rounded-lg bg-gray-200">
            {/*
              `share="morph"` names the transition class the CSS targets, and
              `default="none"` stops this image animating during transitions it
              is not part of. Dropping either one silently disables the morph.
            */}
            <ViewTransition
              name={productImageTransitionName(product.id)}
              share="morph"
              default="none"
            >
              <Image
                src={product.thumbnail}
                placeholder="blur"
                blurDataURL={IMAGE_BLUR_PLACEHOLDER}
                alt={product.title}
                width={200}
                height={200}
                className="size-full object-cover object-center"
              />
            </ViewTransition>
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
