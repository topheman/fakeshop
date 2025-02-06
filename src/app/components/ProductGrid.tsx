import Image from "next/image"
import Link from "next/link"
import type { Product } from "../../lib/api"
import { generateProductSlug } from "../../utils/slugUtils"

export default function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {products.map((product) => (
        <Link
          key={product.id}
          href={`/product/${generateProductSlug(product.title, product.id)}`}
          className="block border rounded-lg p-4 hover:shadow-lg transition-shadow"
        >
          <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-lg bg-gray-200 xl:aspect-w-7 xl:aspect-h-8">
            <Image
              src={product.thumbnail || "/placeholder.svg"}
              alt={product.title}
              width={200}
              height={200}
              className="h-full w-full object-cover object-center"
            />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-gray-700">{product.title}</h2>
          <p className="mt-1 text-lg font-medium text-gray-900">${product.price.toFixed(2)}</p>
        </Link>
      ))}
    </div>
  )
}

