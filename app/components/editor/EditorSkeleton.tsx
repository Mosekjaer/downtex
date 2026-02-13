export function EditorSkeleton() {
  return (
    <div className="flex h-full flex-col bg-white">
      {/* Document header — matches _app.workspace.$wid.$docId.tsx header */}
      <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-2">
        <div className="flex items-center gap-3">
          <div className="h-4 w-36 animate-pulse rounded bg-zinc-200" />
          <div className="h-3 w-20 animate-pulse rounded bg-zinc-100" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-7 w-14 animate-pulse rounded-md bg-zinc-100" />
          <div className="h-7 w-20 animate-pulse rounded-md bg-zinc-200" />
        </div>
      </header>

      {/* Toolbar — matches Toolbar.tsx sticky bar */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-b border-zinc-200 bg-white px-3 py-1.5">
        {/* Text formatting group */}
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-7 w-7 animate-pulse rounded bg-zinc-100" />
          ))}
        </div>
        <div className="mx-1 h-5 w-px bg-zinc-200" />
        {/* Heading group */}
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={`h${i}`} className="h-7 w-7 animate-pulse rounded bg-zinc-100" />
          ))}
        </div>
        <div className="mx-1 h-5 w-px bg-zinc-200" />
        {/* List/block group */}
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={`l${i}`} className="h-7 w-7 animate-pulse rounded bg-zinc-100" />
          ))}
        </div>
      </div>

      {/* A4 page canvas — matches document-canvas + a4-page CSS */}
      <div className="document-canvas flex-1 overflow-y-auto px-4 py-8">
        <div className="a4-page">
          {/* Title */}
          <div className="mb-10 h-8 w-3/5 animate-pulse rounded bg-zinc-100" />

          {/* Paragraph */}
          <div className="space-y-3">
            <div className="h-[1.125rem] w-full animate-pulse rounded bg-zinc-100/60" />
            <div className="h-[1.125rem] w-11/12 animate-pulse rounded bg-zinc-100/60" />
            <div className="h-[1.125rem] w-4/5 animate-pulse rounded bg-zinc-100/60" />
            <div className="h-[1.125rem] w-full animate-pulse rounded bg-zinc-100/60" />
            <div className="h-[1.125rem] w-3/4 animate-pulse rounded bg-zinc-100/60" />
          </div>

          <div className="my-10" />

          {/* Section heading */}
          <div className="mb-5 h-6 w-2/5 animate-pulse rounded bg-zinc-100" />

          {/* Another paragraph */}
          <div className="space-y-3">
            <div className="h-[1.125rem] w-full animate-pulse rounded bg-zinc-100/60" />
            <div className="h-[1.125rem] w-5/6 animate-pulse rounded bg-zinc-100/60" />
            <div className="h-[1.125rem] w-full animate-pulse rounded bg-zinc-100/60" />
            <div className="h-[1.125rem] w-2/3 animate-pulse rounded bg-zinc-100/60" />
          </div>
        </div>
      </div>
    </div>
  );
}
