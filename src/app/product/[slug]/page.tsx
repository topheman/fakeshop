import Image from "next/image"
import { getProduct } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { extractProductIdFromSlug } from "../../../utils/slugUtils"

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const productId = extractProductIdFromSlug(params.slug)
  if (productId === -1) {
    // Handle invalid slug
    return <div>Invalid product URL</div>
  }
  const product = await getProduct(productId)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <Image
            src={product.thumbnail || "/placeholder.svg"}
            alt={product.title}
            width={500}
            height={500}
            className="w-full h-auto object-cover rounded-lg"
          />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-[#900000] mb-4">{product.title}</h1>
          <p className="text-gray-600 mb-4">{product.description}</p>
          <p className="text-2xl font-bold text-[#900000] mb-4">${product.price.toFixed(2)}</p>
          <Button className="bg-[#900000] text-white">Add to Cart</Button>
        </div>
      </div>
    </div>
  )
}

