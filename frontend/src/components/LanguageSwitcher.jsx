import { useTranslation } from 'react-i18next'
import { LANGUAGES } from '../lib/i18n'

function LanguageSwitcher() {
  const { t, i18n } = useTranslation()

  return (
    <nav className="language-switcher" aria-label={t('language.label')}>
      {LANGUAGES.map((language) => (
        <button
          key={language}
          type="button"
          className={
            language === i18n.language ? 'language-button language-button-active' : 'language-button'
          }
          aria-current={language === i18n.language ? 'true' : undefined}
          onClick={() => i18n.changeLanguage(language)}
        >
          {t(`language.${language}`)}
        </button>
      ))}
    </nav>
  )
}

export default LanguageSwitcher
