import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/shared/lib/cn'

import { useChangePasswordMutation } from '../hooks/useProfile'

export function ChangePasswordForm() {
  const { t } = useTranslation()
  const mutation = useChangePasswordMutation()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'error'; key: string } | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (next !== confirm) {
      setFeedback({ type: 'error', key: 'profile.errorPasswordMismatch' })
      return
    }
    if (next.length < 8) {
      setFeedback({ type: 'error', key: 'profile.errorPasswordTooShort' })
      return
    }
    setFeedback(null)
    mutation.mutate(
      { currentPassword: current, newPassword: next },
      {
        onSuccess: () => {
          setFeedback({ type: 'ok', key: 'profile.passwordSuccessToast' })
          setCurrent('')
          setNext('')
          setConfirm('')
        },
        onError: () => setFeedback({ type: 'error', key: 'profile.errorWrongPassword' }),
      },
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <h4 className="text-sm font-semibold">{t('profile.changePasswordHeading')}</h4>
      <input
        type="password"
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
        placeholder={t('profile.currentPasswordLabel')}
        aria-label={t('profile.currentPasswordLabel')}
        className="block w-full rounded border border-muted bg-white px-3 py-2 text-sm"
      />
      <input
        type="password"
        value={next}
        onChange={(e) => setNext(e.target.value)}
        placeholder={t('profile.newPasswordLabel')}
        aria-label={t('profile.newPasswordLabel')}
        className="block w-full rounded border border-muted bg-white px-3 py-2 text-sm"
      />
      <input
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder={t('profile.confirmPasswordLabel')}
        aria-label={t('profile.confirmPasswordLabel')}
        className="block w-full rounded border border-muted bg-white px-3 py-2 text-sm"
      />
      {feedback && (
        <p
          className={cn('text-xs', feedback.type === 'ok' ? 'text-green' : 'text-red')}
          role={feedback.type === 'ok' ? 'status' : 'alert'}
        >
          {t(feedback.key)}
        </p>
      )}
      <button
        type="submit"
        disabled={mutation.isPending}
        className="rounded-md bg-foreground px-4 py-2 text-sm font-semibold text-background disabled:opacity-50"
      >
        {t('profile.changePasswordButton')}
      </button>
    </form>
  )
}
