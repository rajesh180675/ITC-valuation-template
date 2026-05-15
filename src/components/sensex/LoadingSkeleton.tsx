export function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* KPI Cards Skeleton */}
      <div className="flex flex-wrap gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="glass-card p-3 flex flex-col gap-2 min-w-[130px]">
            <div className="h-3 w-24 bg-gray-700/30 rounded animate-pulse" />
            <div className="h-7 w-20 bg-gray-700/30 rounded animate-pulse" />
            <div className="h-3 w-10 bg-gray-700/20 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Tab Bar Skeleton */}
      <div className="flex gap-1 border-b border-gray-800 pb-2">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="h-8 w-28 bg-gray-700/20 rounded animate-pulse" />
        ))}
      </div>

      {/* Content Skeleton */}
      <div className="glass-card p-6 space-y-4 animate-pulse">
        <div className="h-6 w-1/3 bg-gray-700/30 rounded" />
        <div className="h-96 w-full bg-gray-700/20 rounded" />
      </div>
    </div>
  );
}
