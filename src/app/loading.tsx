export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="h-6 w-48 animate-pulse rounded bg-slate-200" />
      <div className="card h-32 animate-pulse bg-slate-100" />
      <div className="card h-64 animate-pulse bg-slate-100" />
    </div>
  );
}
