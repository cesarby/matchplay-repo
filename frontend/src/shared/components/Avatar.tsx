import { pickAvatarColor } from '@/shared/lib/avatarColor'
import { cn } from '@/shared/lib/cn'

// Vite resuelve todas las URLs en build-time. La key es la ruta relativa
// al archivo donde se invoca el glob (./../../assets/avatars/avatar_01.png ...).
const avatarUrls = import.meta.glob<{ default: string }>('../../assets/avatars/avatar_*.png', {
  eager: true,
}) as Record<string, { default: string }>

function urlForCode(code: string): string | null {
  // La key del glob es relativa al archivo actual.
  const key = `../../assets/avatars/${code}.png`
  return avatarUrls[key]?.default ?? null
}

interface AvatarProps {
  username: string
  avatarCode?: string | null
  size?: number
  className?: string
  /**
   * Si true, envuelve el avatar con borde ink 2px y sombra brutal-sm para
   * integrarlo en superficies brutalismo lúdico. Opt-in para no afectar
   * los usos café existentes. Spec §4 (.brutal-sm).
   */
  ringBrutal?: boolean
}

/**
 * Componente unificado para mostrar el avatar de un usuario.
 *
 * - Si `avatarCode` matchea uno de los 31 PNGs presets en
 *   `frontend/src/assets/avatars/`, se renderiza la imagen.
 * - Si no (null/undefined o code no encontrado), fallback a círculo coloreado
 *   con la inicial del username (compatibilidad con el sistema anterior).
 *
 * `size` en píxeles (default 32). El componente fija width/height inline para
 * controlar el tamaño exacto sin depender de Tailwind size utilities (que
 * tienen incrementos discretos).
 *
 * `ringBrutal` añade chrome brutal alrededor del avatar (borde ink + sombra
 * sólida sm) — para integración en headers/menus brutales.
 */
export function Avatar({
  username,
  avatarCode,
  size = 32,
  className,
  ringBrutal = false,
}: AvatarProps) {
  const url = avatarCode ? urlForCode(avatarCode) : null
  const brutalClass = ringBrutal ? 'brutal-sm' : ''

  if (url) {
    return (
      <img
        src={url}
        alt={username}
        width={size}
        height={size}
        className={cn('rounded-full object-cover', brutalClass, className)}
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex items-center justify-center rounded-full font-bold text-white',
        pickAvatarColor(username),
        brutalClass,
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.45) }}
    >
      {username.charAt(0).toUpperCase()}
    </span>
  )
}
