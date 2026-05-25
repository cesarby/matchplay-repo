import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'

import { RouteSkeleton } from '@/shared/components/RouteSkeleton'

export function SuspenseShell() {
  return (
    <Suspense fallback={<RouteSkeleton />}>
      <Outlet />
    </Suspense>
  )
}
