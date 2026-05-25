import { type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

import { AuthBootSplash } from '../components/AuthBootSplash'
import { useAuthStatus, useCurrentUser } from '../store/authStore'
import type { Role } from '../types/auth.types'

interface Props {
  roles: Role[]
  children: ReactNode
}

export function RoleRoute({ roles, children }: Props) {
  const status = useAuthStatus()
  const user = useCurrentUser()

  if (status === 'idle' || status === 'booting') {
    return <AuthBootSplash />
  }
  if (status === 'anonymous') {
    return <Navigate to="/login" replace />
  }
  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}
