import { httpClient } from '@/shared/api/httpClient'

import type {
  AuthResponse,
  CurrentUser,
  LoginPayload,
  RefreshResponse,
  RegisterPayload,
} from '../types/auth.types'

export const authApi = {
  register: (body: RegisterPayload) =>
    httpClient.post<AuthResponse>('/auth/register', body).then((r) => r.data),

  login: (body: LoginPayload) =>
    httpClient.post<AuthResponse>('/auth/login', body).then((r) => r.data),

  refresh: () => httpClient.post<RefreshResponse>('/auth/refresh').then((r) => r.data),

  logout: () => httpClient.post<void>('/auth/logout').then(() => undefined),

  me: () => httpClient.get<CurrentUser>('/auth/me').then((r) => r.data),
}
