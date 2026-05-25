import type { ApiError } from '@/shared/api/ApiError'

export type AuthErrorChannel = 'toast' | 'banner' | 'field'

interface FieldMapping {
  channel: 'field'
  field: string
  i18nKey: string
}

interface MessageMapping {
  channel: 'toast' | 'banner'
  i18nKey: string
}

type Mapping = FieldMapping | MessageMapping

const MAP: Record<string, Mapping> = {
  'error.auth.invalid.credentials': {
    channel: 'banner',
    i18nKey: 'auth.errors.invalidCredentials',
  },
  'error.auth.email.duplicate': {
    channel: 'field',
    field: 'email',
    i18nKey: 'auth.email.duplicate',
  },
  'error.auth.username.duplicate': {
    channel: 'field',
    field: 'username',
    i18nKey: 'auth.username.duplicate',
  },
  'error.geo.province.not.found': {
    channel: 'field',
    field: 'provinceCode',
    i18nKey: 'auth.province.required',
  },
  'error.geo.city.not.found': {
    channel: 'field',
    field: 'cityCode',
    i18nKey: 'auth.city.required',
  },
  'error.geo.area.not.found': {
    channel: 'field',
    field: 'areaCode',
    i18nKey: 'auth.area.required',
  },
  'error.auth.rate.limited': { channel: 'banner', i18nKey: 'auth.errors.rateLimited' },
  'error.auth.refresh.invalid': { channel: 'toast', i18nKey: 'auth.session.expired' },
}

export function mapAuthError(error: ApiError): Mapping {
  return MAP[error.code] ?? { channel: 'banner', i18nKey: 'auth.errors.generic' }
}
