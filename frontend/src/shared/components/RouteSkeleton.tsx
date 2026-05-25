export function RouteSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[50vh] items-center justify-center text-muted-foreground"
    >
      Cargando…
    </div>
  )
}
