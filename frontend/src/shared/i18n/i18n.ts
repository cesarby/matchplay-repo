import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import { useLocaleStore } from '@/shared/store/localeStore'

import en from './locales/en.json'
import es from './locales/es.json'

void i18n.use(initReactI18next).init({
  resources: {
    es: { translation: es },
    en: { translation: en },
  },
  lng: useLocaleStore.getState().locale,
  fallbackLng: 'es',
  interpolation: { escapeValue: false },
})

useLocaleStore.subscribe((state) => {
  if (i18n.language !== state.locale) {
    void i18n.changeLanguage(state.locale)
  }
})

export default i18n
