export function Skeleton({ className = "" }) {
  return <div className={`skeleton rounded-md ${className}`} />;
}

export function ListSkeleton({ rows = 3 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, idx) => (
        <div key={idx} className="saas-list-card p-3 md:p-4 space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function StatCardSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="saas-card p-4 md:p-5 space-y-3">
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-8 w-1/3" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 6 }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3">
        <Skeleton className="h-3 w-32" />
      </div>
      <div className="space-y-3 px-4 py-4">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div key={rowIdx} className="grid grid-cols-6 gap-3">
            {Array.from({ length: cols }).map((__, colIdx) => (
              <Skeleton key={colIdx} className="h-3 w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="saas-card p-4 space-y-3">
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      ))}
    </div>
  );
}
