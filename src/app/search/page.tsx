import SearchResults from "../../components/SearchResults";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q : "";

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-primary mb-4">
        {query ? `Search Results for "${query}"` : "Search Products"}
      </h1>
      <SearchResults query={query} />
    </div>
  );
}
