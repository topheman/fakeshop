"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { searchProducts } from "../../lib/api"
import ProductGrid from "../app/components/ProductGrid"
import type { Product } from "../../types"

export default function SearchResults({ query: initialQuery }: { query: string }) {
  const [results, setResults] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  const query = searchParams.get("q") || initialQuery

  useEffect(() => {
    const fetchResults = async () => {
      if (query) {
        setLoading(true)
        try {
          const searchResults = await searchProducts(query)
          setResults(searchResults.products)
        } catch (error) {
          console.error("Error fetching search results:", error)
          setResults([])
        } finally {
          setLoading(false)
        }
      } else {
        setResults([])
      }
    }

    fetchResults()
  }, [query])

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div>
      {query ? (
        results.length > 0 ? (
          <ProductGrid products={results} />
        ) : (
          <p>No products found for "{query}"</p>
        )
      ) : (
        <p>Use the search box above to find products.</p>
      )}
    </div>
  )
}

