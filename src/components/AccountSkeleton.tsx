/**
 * See `CheckoutSkeleton` — same reasoning. `/account` is behind a session, so
 * its shell is rendered per session rather than once at build time, but the
 * fallback still covers the same gap: everything below the boundary reads
 * `cookies()`, and this is what stands in for it.
 */
export function AccountSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border bg-card p-6 shadow-sm">
      <div className="grid gap-6 md:grid-cols-2">
        {[3, 2].map((fieldCount, columnIndex) => (
          <div key={columnIndex}>
            <div className="mb-4 h-7 w-48 rounded bg-gray-200" />
            <div className="space-y-3">
              {Array.from({ length: fieldCount }).map((_, index) => (
                <div key={index}>
                  <div className="h-4 w-20 rounded bg-gray-200" />
                  <div className="mt-1 h-6 w-52 rounded bg-gray-200" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-8">
        <div className="mb-4 h-7 w-40 rounded bg-gray-200" />
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, index) => (
            <div
              key={index}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div className="flex flex-col gap-2">
                <div className="h-5 w-56 rounded bg-gray-200" />
                <div className="h-4 w-40 rounded bg-gray-200" />
              </div>
              <div className="h-6 w-20 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
