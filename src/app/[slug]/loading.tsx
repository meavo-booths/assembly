function SkeletonCard() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="h-4 w-1/3 animate-pulse rounded bg-slate-200" />
      <div className="mt-3 h-3 w-2/3 animate-pulse rounded bg-slate-100" />
      <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-slate-100" />
    </div>
  );
}

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading" className="mx-auto min-h-screen max-w-lg px-4 py-6">
      <div className="mb-6 h-7 w-40 animate-pulse rounded bg-slate-200" />
      <div className="grid gap-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}
