import { ChevronDown } from 'lucide-react'
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
  const [open, setOpen] = useState(false)

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
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 rounded-md border border-muted bg-card p-3 text-left text-sm transition hover:bg-muted/40"
      >
        <Avatar username={username} avatarCode={currentCode} size={40} />
        <span>{t('profile.avatarChange')}</span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={cn('ml-auto transition', open && 'rotate-180')}
        />
      </button>
      {open && (
        <div className="mt-3 grid grid-cols-7 gap-3 rounded-lg border border-muted bg-card p-3">
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
                    ? 'ring-2 ring-blue ring-offset-2 ring-offset-card'
                    : 'opacity-80 hover:opacity-100',
                  saving && 'animate-pulse',
                )}
              >
                <Avatar username={username} avatarCode={code} size={56} />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
