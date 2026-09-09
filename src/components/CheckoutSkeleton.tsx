/**
 * The App Shell for `/checkout` is what a `<Link>` delivers before the click,
 * so this is the first paint of the route rather than a flash between two
 * renders. It mirrors the two-column layout of `CheckoutContent` — the two
 * cards on the left, the order summary on the right — so the streamed content
 * lands in the boxes the visitor is already looking at.
 */
export function CheckoutSkeleton() {
  return (
    <div className="grid animate-pulse gap-8 lg:grid-cols-2">
      <div className="space-y-6">
        <div className="rounded-lg border bg-card p-6">
          <div className="mb-4 h-7 w-56 rounded bg-gray-200" />
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index}>
                <div className="h-4 w-20 rounded bg-gray-200" />
                <div className="mt-1 h-6 w-48 rounded bg-gray-200" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <div className="mb-4 h-7 w-40 rounded bg-gray-200" />
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-[74px] rounded-lg border bg-white"
              />
            ))}
            <div className="mt-8 h-11 w-full rounded bg-primary/20" />
          </div>
        </div>
      </div>
      <div className="rounded-lg border bg-card p-6">
        <div className="mb-4 h-7 w-40 rounded bg-gray-200" />
        <div className="divide-y">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="flex items-center gap-4 py-4">
              <div className="size-20 shrink-0 rounded-md bg-gray-200" />
              <div className="flex flex-1 flex-col gap-2">
                <div className="h-5 w-3/4 rounded bg-gray-200" />
                <div className="h-4 w-24 rounded bg-gray-200" />
              </div>
              <div className="h-5 w-16 rounded bg-gray-200" />
            </div>
          ))}
        </div>
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between border-t pt-4">
            <div className="h-5 w-20 rounded bg-gray-200" />
            <div className="h-5 w-16 rounded bg-gray-200" />
          </div>
          <div className="flex items-center justify-between border-t pt-4">
            <div className="h-7 w-16 rounded bg-gray-200" />
            <div className="h-7 w-20 rounded bg-gray-200" />
          </div>
        </div>
      </div>
    </div>
  );
}
