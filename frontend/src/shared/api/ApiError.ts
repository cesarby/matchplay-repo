import type { AxiosError } from 'axios'

export interface FieldError {
  field: string
  message: string
}

export interface ApiError {
  status: number
  code: string
  message: string
  fieldErrors?: FieldError[]
}

interface BackendErrorBody {
  status: number
  code?: string
  message?: string
  fieldErrors?: FieldError[]
}

export function normalizeApiError(error: unknown): ApiError {
  const axiosErr = error as AxiosError<BackendErrorBody>
  const body = axiosErr.response?.data
  return {
    status: axiosErr.response?.status ?? 0,
    code: body?.code ?? 'error.unknown',
    message: body?.message ?? axiosErr.message ?? 'Unknown error',
    fieldErrors: body?.fieldErrors,
  }
}
