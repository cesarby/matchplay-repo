/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_APP_NAME: string
  readonly VITE_APP_URL: string
  readonly VITE_DEFAULT_LOCALE: string
  readonly VITE_SUPPORTED_LOCALES: string
  readonly VITE_ENV: 'development' | 'staging' | 'production'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
