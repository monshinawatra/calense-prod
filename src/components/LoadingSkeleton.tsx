export function LoadingSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading">
      <div className="animate-shimmer h-5 w-2/5 rounded-lg" />
      <div className="animate-shimmer h-4 w-full rounded-lg" />
      <div className="animate-shimmer h-4 w-4/5 rounded-lg" />

      <div className="mt-6 space-y-2.5">
        {[0, 1, 2].map(i => (
          <div key={i} className="p-4 rounded-xl border border-[#1E2D4A] space-y-2">
            <div className="animate-shimmer h-4 w-1/3 rounded-lg" />
            <div className="animate-shimmer h-3 w-full rounded-lg" />
            <div className="animate-shimmer h-3 w-3/4 rounded-lg" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading content…</span>
    </div>
  );
}
