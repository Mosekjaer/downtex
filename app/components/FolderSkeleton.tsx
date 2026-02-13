export function FolderSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-y-auto bg-zinc-50/50">
      <div className="mx-auto w-full max-w-5xl px-8 py-10">
        {/* Header — breadcrumbs + action buttons */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-1 text-sm">
            <div className="h-4 w-10 animate-pulse rounded bg-zinc-200" />
            <span className="text-zinc-300">/</span>
            <div className="h-4 w-20 animate-pulse rounded bg-zinc-200" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-[5.5rem] animate-pulse rounded-md bg-accent-200/50" />
            <div className="h-8 w-[6.25rem] animate-pulse rounded-md border border-zinc-200 bg-zinc-50" />
          </div>
        </div>

        {/* Folders section */}
        <section className="mb-8">
          <div className="mb-3 h-3 w-14 animate-pulse rounded bg-zinc-200/70" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3"
              >
                <div className="h-5 w-5 animate-pulse rounded bg-zinc-100" />
                <div
                  className="h-4 animate-pulse rounded bg-zinc-100"
                  style={{ width: `${5 + i * 2}rem` }}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Documents section */}
        <section>
          <div className="mb-3 h-3 w-20 animate-pulse rounded bg-zinc-200/70" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-zinc-200 bg-white p-4">
                <div className="mb-3 flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 animate-pulse items-center justify-center rounded-md bg-accent-50/50" />
                  <div className="min-w-0 flex-1">
                    <div
                      className="h-4 animate-pulse rounded bg-zinc-100"
                      style={{ width: `${60 + i * 12}%` }}
                    />
                    <div className="mt-1.5 h-3 w-12 animate-pulse rounded bg-zinc-100/50" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="h-2 w-full animate-pulse rounded bg-zinc-100/70" />
                  <div className="h-2 w-4/5 animate-pulse rounded bg-zinc-100/70" />
                  <div className="h-2 w-3/5 animate-pulse rounded bg-zinc-100/70" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
