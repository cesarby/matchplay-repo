import type { ApiError } from '@/shared/api/ApiError'

/**
 * Mapeo de códigos error.session.* a destino de UI:
 *  - 'field': el error pertenece a un campo del form (el padre lo setea con setError)
 *  - 'banner': el error es global, no se asocia a campo
 *  - 'toast': se muestra como toast efímero (cuando exista infra)
 */
export type SessionErrorTarget =
  | { channel: 'field'; field: string; i18nKey: string }
  | { channel: 'banner'; i18nKey: string }

/**
 * Traduce un ApiError del backend a la clave i18n del frontend y dónde mostrarlo.
 *
 * Si el código no se reconoce, se devuelve un banner genérico.
 */
export function mapSessionError(err: ApiError): SessionErrorTarget {
  switch (err.code) {
    case 'error.session.scheduled.in.past':
      return { channel: 'field', field: 'scheduledAt', i18nKey: 'sessions.errors.scheduledInPast' }
    case 'error.session.max.players.above.game':
      return { channel: 'field', field: 'maxPlayers', i18nKey: 'sessions.errors.maxAboveGame' }
    case 'error.session.max.players.below.game.min':
      return { channel: 'field', field: 'maxPlayers', i18nKey: 'sessions.errors.maxBelowGameMin' }
    case 'error.session.max.players.below.current':
      return { channel: 'field', field: 'maxPlayers', i18nKey: 'sessions.errors.maxBelowCurrent' }
    case 'error.session.full':
      return { channel: 'banner', i18nKey: 'sessions.errors.full' }
    case 'error.session.already.joined':
      return { channel: 'banner', i18nKey: 'sessions.errors.alreadyJoined' }
    case 'error.session.join.own':
      return { channel: 'banner', i18nKey: 'sessions.errors.joinOwn' }
    case 'error.session.not.owner':
      return { channel: 'banner', i18nKey: 'sessions.errors.notOwner' }
    case 'error.session.not.participant':
      return { channel: 'banner', i18nKey: 'sessions.errors.notParticipant' }
    case 'error.session.status.invalid.transition':
      return { channel: 'banner', i18nKey: 'sessions.errors.invalidTransition' }
    case 'error.session.not.found':
      return { channel: 'banner', i18nKey: 'sessions.errors.notFound' }
    case 'error.session.expansion.wrong.base':
      return { channel: 'banner', i18nKey: 'sessions.errors.expansionWrongBase' }
    case 'error.session.expansion.not.expansion':
      return { channel: 'banner', i18nKey: 'sessions.errors.expansionNotExpansion' }
    case 'error.session.guests.exceed.max':
      return {
        channel: 'field',
        field: 'creatorGuests',
        i18nKey: 'sessions.errors.guestsExceedMax',
      }
    case 'error.session.creator.cannot.leave':
      return { channel: 'banner', i18nKey: 'sessions.errors.creatorCannotLeave' }
    default:
      return { channel: 'banner', i18nKey: 'auth.errors.generic' }
  }
}
