import { type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { AuthBootSplash } from '../components/AuthBootSplash'
import { useAuthStatus } from '../store/authStore'

interface Props {
  children: ReactNode
}

export function ProtectedRoute({ children }: Props) {
  const status = useAuthStatus()
  const location = useLocation()

  if (status === 'idle' || status === 'booting') {
    return <AuthBootSplash />
  }
  if (status === 'anonymous') {
    const from = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?from=${from}`} replace />
  }
  return <>{children}</>
}
