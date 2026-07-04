// Route-level loading UI (App Router convention). Shown during server
// renders/ISR misses so navigation never appears frozen.
export default function Loading() {
  return (
    <div className="container flex min-h-[50vh] items-center justify-center py-16">
      <div className="flex items-center gap-3 text-muted-foreground" role="status" aria-live="polite">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent motion-reduce:animate-none" aria-hidden="true" />
        <span className="text-sm font-medium tracking-wide">Loading…</span>
      </div>
    </div>
  );
}
