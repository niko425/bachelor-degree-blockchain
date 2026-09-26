import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from '../locales/en.json'
import mk from '../locales/mk.json'
import sq from '../locales/sq.json'

export const LANGUAGES = ['mk', 'sq', 'en']

export const LOCALES = {
  mk: 'mk-MK',
  sq: 'sq-AL',
  en: 'en-US',
}

const STORAGE_KEY = 'language'

function storedLanguage() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return LANGUAGES.includes(stored) ? stored : null
  } catch {
    return null
  }
}

export function localeFor(language) {
  return LOCALES[language] ?? LOCALES.mk
}

i18n.use(initReactI18next).init({
  resources: {
    mk: { translation: mk },
    sq: { translation: sq },
    en: { translation: en },
  },
  lng: storedLanguage() ?? 'mk',
  fallbackLng: 'mk',
  interpolation: { escapeValue: false },
})

document.documentElement.lang = i18n.language

i18n.on('languageChanged', (language) => {
  document.documentElement.lang = language
  try {
    window.localStorage.setItem(STORAGE_KEY, language)
  } catch {
    return
  }
})

export default i18n
