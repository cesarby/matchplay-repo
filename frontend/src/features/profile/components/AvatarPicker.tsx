import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Avatar } from '@/shared/components/Avatar'
import { cn } from '@/shared/lib/cn'

import { useUpdateProfileMutation } from '../hooks/useProfile'

const CODES = Array.from({ length: 31 }, (_, i) => `avatar_${String(i + 1).padStart(2, '0')}`)

interface AvatarPickerProps {
  username: string
  currentCode: string | null
}

export function AvatarPicker({ username, currentCode }: AvatarPickerProps) {
  const { t } = useTranslation()
  const update = useUpdateProfileMutation()
  const [savingCode, setSavingCode] = useState<string | null>(null)

  function pick(code: string) {
    if (code === currentCode) return
    setSavingCode(code)
    update.mutate({ avatarCode: code }, { onSettled: () => setSavingCode(null) })
  }

  return (
    <div>
      <h4 className="mb-3 text-[11px] font-bold uppercase tracking-[0.5px] text-[#8B7355]">
        {t('profile.headingAvatar')}
      </h4>
      <div className="grid grid-cols-7 gap-3 rounded-lg border border-muted bg-white p-3">
        {CODES.map((code) => {
          const selected = code === currentCode
          const saving = code === savingCode
          return (
            <button
              key={code}
              type="button"
              aria-label={code}
              aria-pressed={selected}
              onClick={() => pick(code)}
              disabled={update.isPending}
              className={cn(
                'rounded-full transition focus:outline-none',
                selected
                  ? 'ring-2 ring-blue ring-offset-2 ring-offset-white'
                  : 'opacity-80 hover:opacity-100',
                saving && 'animate-pulse',
              )}
            >
              <Avatar username={username} avatarCode={code} size={56} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
