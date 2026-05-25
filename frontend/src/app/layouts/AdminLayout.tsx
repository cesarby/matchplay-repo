import { Outlet } from 'react-router-dom'

export function AdminLayout() {
  return (
    <div className="flex min-h-dvh">
      <aside className="w-64 border-r bg-card p-4">
        <span className="font-display text-lg font-semibold">Admin</span>
      </aside>
      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  )
}
