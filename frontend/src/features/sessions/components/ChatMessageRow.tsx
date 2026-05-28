import { useTranslation } from 'react-i18next'

import { Avatar } from '@/shared/components/Avatar'
import { cn } from '@/shared/lib/cn'

import type { SessionMessage } from '../types/session.types'

interface ChatMessageRowProps {
  message: SessionMessage
  mine: boolean
}

export function ChatMessageRow({ message, mine }: ChatMessageRowProps) {
  const { i18n } = useTranslation()
  const time = new Intl.DateTimeFormat(i18n.language, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(message.createdAt))
  const isPending = message.id < 0

  return (
    <li
      className={cn(
        'flex max-w-[85%] items-start gap-2',
        mine ? 'flex-row-reverse self-end' : 'self-start',
        isPending && 'opacity-60',
      )}
    >
      {!mine && (
        <div className="shrink-0 pt-1">
          <Avatar username={message.username} avatarCode={message.authorAvatarCode} size={24} />
        </div>
      )}
      <div
        className={cn(
          'flex flex-col gap-1 rounded-md px-3 py-2',
          mine ? 'bg-red text-white' : 'bg-muted text-foreground',
        )}
      >
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className={cn(mine ? 'text-white/80' : 'text-muted-foreground')}>
            @{message.username}
          </span>
          <span className={cn(mine ? 'text-white/60' : 'text-muted-foreground')}>{time}</span>
        </div>
        <p className="whitespace-pre-wrap break-words text-sm leading-snug">{message.content}</p>
      </div>
    </li>
  )
}
