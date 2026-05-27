const PALETTE = [
  'bg-red',
  'bg-yellow',
  'bg-green',
  'bg-blue',
  'bg-foreground',
  'bg-muted-foreground',
] as const

type AvatarBg = (typeof PALETTE)[number]

/**
 * Devuelve una clase Tailwind de fondo determinística para el username.
 * Mismo username → mismo color (sin estado, basta el username como input).
 *
 * Implementación: suma simple de char codes módulo el tamaño de la paleta.
 * No es criptográfico — solo necesitamos consistencia visual.
 */
export function pickAvatarColor(username: string): AvatarBg {
  if (!username) return PALETTE[0]
  let sum = 0
  for (let i = 0; i < username.length; i++) {
    sum += username.charCodeAt(i)
  }
  return PALETTE[sum % PALETTE.length]
}
