import { Home, Plus, Search, User, History } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'

interface TabItem {
  to: string
  labelKey: string
  Icon: typeof Home
  /** match exacto (path) o startsWith (prefix) para resaltar el item activo */
  match: 'exact' | 'prefix'
  /** Si es el botón "+" central — se renderiza distinto (flotante, círculo rojo) */
  center?: boolean
}

const ITEMS: TabItem[] = [
  { to: '/', labelKey: 'landing.tabBar.home', Icon: Home, match: 'exact' },
  { to: '/sessions', labelKey: 'landing.tabBar.explore', Icon: Search, match: 'prefix' },
  {
    to: '/sessions/new',
    labelKey: 'landing.tabBar.create',
    Icon: Plus,
    match: 'exact',
    center: true,
  },
  { to: '/sessions/mine', labelKey: 'landing.tabBar.mine', Icon: History, match: 'prefix' },
  { to: '/profile', labelKey: 'landing.tabBar.account', Icon: User, match: 'prefix' },
]

/**
 * Tab bar inferior global — visible en TODAS las pantallas (`md:hidden`).
 *
 * Montada desde MainLayout, no desde LandingContent. Esto garantiza que la
 * navegación inferior persista en `/`, `/sessions`, `/profile`, etc. sin
 * tener que duplicar el componente.
 *
 * En estado GUEST, los enlaces protegidos disparan el `ProtectedRoute`
 * aguas abajo (redirige a /login). Este componente NO checkea auth.
 *
 * Sticky bottom — `position: sticky` se aplica vía utility.
 */
export function MobileTabBar() {
  const { t } = useTranslation()
  const { pathname } = useLocation()

  return (
    <nav
      aria-label={t('landing.tabBar.ariaLabel')}
      className="sticky bottom-0 z-30 bg-transparent px-3 pb-3 pt-2 md:hidden"
    >
      <div className="brutal-lg flex items-center justify-around rounded-2xl bg-background p-2">
        {ITEMS.map((item) => {
          const isActive =
            item.match === 'exact' ? pathname === item.to : pathname.startsWith(item.to)
          return (
            <TabBarItem key={item.to} item={item} isActive={isActive} label={t(item.labelKey)} />
          )
        })}
      </div>
    </nav>
  )
}

interface TabBarItemProps {
  item: TabItem
  isActive: boolean
  label: string
}

function TabBarItem({ item, isActive, label }: TabBarItemProps) {
  const { Icon, to, center } = item

  if (center) {
    return (
      <Link to={to} aria-label={label} className="-mt-6 flex flex-col items-center">
        <span className="brutal-lg flex size-[52px] items-center justify-center rounded-xl bg-red text-background">
          <Icon size={24} strokeWidth={3} aria-hidden="true" />
        </span>
      </Link>
    )
  }

  return (
    <Link
      to={to}
      className={`flex flex-col items-center gap-0.5 ${
        isActive ? 'text-red' : 'text-muted-foreground'
      }`}
    >
      <Icon size={22} strokeWidth={isActive ? 2.5 : 2.2} aria-hidden="true" />
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </Link>
  )
}
