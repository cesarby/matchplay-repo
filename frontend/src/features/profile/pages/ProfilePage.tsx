import { useTranslation } from 'react-i18next'
import { Navigate } from 'react-router-dom'

import { useAuth } from '@/features/auth/hooks/useAuth'
import { Avatar } from '@/shared/components/Avatar'
import { SeoHead } from '@/shared/components/SeoHead'

import { AccountSection } from '../components/AccountSection'
import { AvatarPicker } from '../components/AvatarPicker'
import { BioForm } from '../components/BioForm'
import { FavoriteGamesPicker } from '../components/FavoriteGamesPicker'
import { useProfileQuery } from '../hooks/useProfile'

export default function ProfilePage() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
  const { data, isLoading, isError } = useProfileQuery()

  if (!isAuthenticated) return <Navigate to="/login?next=/profile" replace />

  if (isLoading || !data) {
    return (
      <div className="container py-8 text-center text-muted-foreground">{t('common.loading')}</div>
    )
  }
  if (isError) {
    return (
      <div className="container py-8 text-center text-muted-foreground">{t('common.error')}</div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <SeoHead
        title={`${t('profile.title')} | Match&Play`}
        description={t('profile.title')}
        noindex
      />
      <div className="overflow-hidden rounded-xl bg-[#FAF7F2] shadow-[0_6px_20px_rgba(0,0,0,0.08)]">
        <div className="flex items-center gap-4 border-b border-muted bg-card px-6 py-5">
          <Avatar username={data.username} avatarCode={data.avatarCode} size={48} />
          <div>
            <h1 className="m-0 font-display text-xl font-bold">@{data.username}</h1>
            <p className="m-0 text-xs text-muted-foreground">{data.email}</p>
            {data.bio && <p className="mt-1 text-sm italic text-muted-foreground">{data.bio}</p>}
          </div>
        </div>

        <div className="space-y-0 divide-y divide-muted">
          <section className="px-6 py-5">
            <AvatarPicker username={data.username} currentCode={data.avatarCode} />
          </section>
          <section className="px-6 py-5">
            <BioForm initialBio={data.bio} />
          </section>
          <section className="px-6 py-5">
            <FavoriteGamesPicker initial={data.favoriteGames} />
          </section>
          <section className="px-6 py-5">
            <AccountSection />
          </section>
        </div>
      </div>
    </div>
  )
}
