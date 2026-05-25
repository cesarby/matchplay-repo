export type AuthEvent = 'login' | 'logout' | 'refreshed'
export interface AuthEventMessage {
  type: AuthEvent
  ts: number
}

const CHANNEL_NAME = 'matchplay-auth'

interface ChannelLike {
  postMessage: (msg: AuthEventMessage) => void
  addEventListener: (type: 'message', handler: (e: MessageEvent<AuthEventMessage>) => void) => void
  removeEventListener: (
    type: 'message',
    handler: (e: MessageEvent<AuthEventMessage>) => void,
  ) => void
}

function createChannel(): ChannelLike | null {
  if (typeof window === 'undefined') return null
  if (typeof BroadcastChannel === 'undefined') return null
  return new BroadcastChannel(CHANNEL_NAME)
}

const channel = createChannel()

export const authBroadcast = {
  publish(type: AuthEvent): void {
    channel?.postMessage({ type, ts: Date.now() })
  },
  subscribe(handler: (msg: AuthEventMessage) => void): () => void {
    if (!channel) return () => undefined
    const listener = (e: MessageEvent<AuthEventMessage>) => handler(e.data)
    channel.addEventListener('message', listener)
    return () => channel.removeEventListener('message', listener)
  },
}
