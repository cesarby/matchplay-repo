import { useTranslation } from 'react-i18next'

import { ChangePasswordForm } from './ChangePasswordForm'

interface Props {
  username: string
  email: string
}

export function AccountSection({ username, email }: Props) {
  const { t } = useTranslation()
  return (
    <div className="space-y-4">
      <h4 className="text-[11px] font-bold uppercase tracking-[0.5px] text-[#8B7355]">
        {t('profile.headingAccount')}
      </h4>
      <div>
        <label className="block text-xs text-muted-foreground">{t('profile.usernameLabel')}</label>
        <p className="text-sm font-medium">{username}</p>
        <p className="text-[11px] italic text-muted-foreground">{t('profile.usernameHelp')}</p>
      </div>
      <div>
        <label className="block text-xs text-muted-foreground">{t('profile.emailLabel')}</label>
        <p className="text-sm font-medium">{email}</p>
        <p className="text-[11px] italic text-muted-foreground">{t('profile.emailHelp')}</p>
      </div>
      <ChangePasswordForm />
    </div>
  )
}
