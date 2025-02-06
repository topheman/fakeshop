import { Suspense } from "react"
import SearchForm from "../../components/SearchForm"
import SearchResults from "../../components/SearchResults"

export default function SearchPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const query = typeof searchParams.q === "string" ? searchParams.q : ""

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-primary mb-4">
        {query ? `Search Results for "${query}"` : "Search Products"}
      </h1>
      <Suspense fallback={<div>Loading...</div>}>
        <SearchResults query={query} />
      </Suspense>
    </div>
  )
}

