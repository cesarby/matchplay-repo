import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useUpdateProfileMutation } from '../hooks/useProfile'

const MAX = 280

interface BioFormProps {
  initialBio: string | null
}

export function BioForm({ initialBio }: BioFormProps) {
  const { t } = useTranslation()
  const update = useUpdateProfileMutation()
  const [bio, setBio] = useState(initialBio ?? '')
  const [feedback, setFeedback] = useState<'saved' | null>(null)

  function handleSubmit() {
    update.mutate(
      { bio },
      {
        onSuccess: () => {
          setFeedback('saved')
          setTimeout(() => setFeedback(null), 2000)
        },
      },
    )
  }

  return (
    <div>
      <h4 className="mb-3 text-[11px] font-bold uppercase tracking-[0.5px] text-[#8B7355]">
        {t('profile.headingBio')}
      </h4>
      <textarea
        value={bio}
        onChange={(e) => setBio(e.target.value.slice(0, MAX))}
        rows={3}
        maxLength={MAX}
        className="w-full rounded-md border border-muted bg-white px-3 py-2 text-sm"
        placeholder={t('profile.bioPlaceholder')}
      />
      <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {bio.length} / {MAX}
        </span>
        {feedback === 'saved' && (
          <span className="text-green" role="status">
            {t('profile.bioSavedToast')}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={update.isPending || bio === (initialBio ?? '')}
        className="mt-2 rounded-md bg-foreground px-4 py-2 text-sm font-semibold text-background disabled:opacity-50"
      >
        {t('profile.bioSaveButton')}
      </button>
    </div>
  )
}
