import { useTranslation } from 'react-i18next'

import { ChangePasswordForm } from './ChangePasswordForm'

export function AccountSection() {
  const { t } = useTranslation()
  return (
    <div className="space-y-4">
      <h4 className="text-[11px] font-bold uppercase tracking-[0.5px] text-[#8B7355]">
        {t('profile.headingPassword')}
      </h4>
      <ChangePasswordForm />
    </div>
  )
}
