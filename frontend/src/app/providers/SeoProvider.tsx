import { type ReactNode } from 'react'
import { HelmetProvider } from 'react-helmet-async'

interface Props {
  children: ReactNode
}

export function SeoProvider({ children }: Props) {
  return <HelmetProvider>{children}</HelmetProvider>
}
