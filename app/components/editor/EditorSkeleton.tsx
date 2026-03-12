export function EditorSkeleton() {
  return (
    <div className="flex h-full flex-col">
      {/* Header bar skeleton */}
      <header className="flex h-12 items-center gap-3 border-b border-zinc-200 px-4">
        <div className="h-4 w-40 animate-pulse rounded bg-zinc-200" />
        <div className="flex-1" />
        <div className="h-7 w-16 animate-pulse rounded bg-zinc-100" />
        <div className="h-7 w-24 animate-pulse rounded bg-zinc-200" />
      </header>

      {/* Toolbar skeleton */}
      <div className="flex h-10 items-center gap-2 border-b border-zinc-100 px-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-6 w-6 animate-pulse rounded bg-zinc-100" />
        ))}
        <div className="mx-1 h-5 w-px bg-zinc-100" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={`b${i}`} className="h-6 w-6 animate-pulse rounded bg-zinc-100" />
        ))}
      </div>

      {/* A4 page skeleton */}
      <div className="flex flex-1 justify-center overflow-y-auto bg-zinc-50 p-8">
        <div className="w-full max-w-[210mm] rounded-sm bg-white p-16 shadow-sm">
          {/* Title */}
          <div className="mb-8 h-7 w-3/5 animate-pulse rounded bg-zinc-200" />

          {/* Paragraph lines */}
          <div className="space-y-3">
            <div className="h-4 w-full animate-pulse rounded bg-zinc-100" />
            <div className="h-4 w-11/12 animate-pulse rounded bg-zinc-100" />
            <div className="h-4 w-4/5 animate-pulse rounded bg-zinc-100" />
            <div className="h-4 w-full animate-pulse rounded bg-zinc-100" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-100" />
          </div>

          {/* Gap */}
          <div className="my-8" />

          {/* Section heading */}
          <div className="mb-4 h-5 w-2/5 animate-pulse rounded bg-zinc-200" />

          {/* More paragraph lines */}
          <div className="space-y-3">
            <div className="h-4 w-full animate-pulse rounded bg-zinc-100" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-zinc-100" />
            <div className="h-4 w-full animate-pulse rounded bg-zinc-100" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-zinc-100" />
          </div>
        </div>
      </div>
    </div>
  );
}
