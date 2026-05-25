import { Navigate } from 'react-router-dom'

import { AuthBootSplash } from '@/features/auth/components/AuthBootSplash'
import { useAuth } from '@/features/auth/hooks/useAuth'

import { LandingContent } from '../components/LandingContent'

/**
 * Página raíz `/`.
 *
 * Comportamiento por estado:
 * - idle | booting      → <AuthBootSplash /> (boot todavía en curso)
 * - authenticated       → redirect a /sessions (la landing es para anónimos)
 * - anonymous           → <LandingContent />
 */
export default function LandingPage() {
  const { status } = useAuth()

  if (status === 'authenticated') {
    return <Navigate to="/sessions" replace />
  }

  if (status === 'idle' || status === 'booting') {
    return <AuthBootSplash />
  }

  return <LandingContent />
}
