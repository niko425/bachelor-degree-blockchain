import { useTranslation } from 'react-i18next'
import { formatCount, formatTurnout } from '../lib/format'
import { localeFor } from '../lib/i18n'

function ElectionStats({ approvedVoterCount, totalVotes, candidateCount, stateLabel }) {
  const { t, i18n } = useTranslation()
  const locale = localeFor(i18n.language)

  return (
    <dl className="stats">
      <div>
        <dt>{t('stats.registered')}</dt>
        <dd>{formatCount(approvedVoterCount, locale)}</dd>
      </div>
      <div>
        <dt>{t('stats.votesCast')}</dt>
        <dd>{formatCount(totalVotes, locale)}</dd>
      </div>
      <div>
        <dt>{t('stats.turnout')}</dt>
        <dd>{formatTurnout(totalVotes, approvedVoterCount, locale)}</dd>
      </div>
      <div>
        <dt>{t('stats.candidates')}</dt>
        <dd>{formatCount(candidateCount, locale)}</dd>
      </div>
      <div>
        <dt>{t('stats.state')}</dt>
        <dd>{stateLabel ? t(`state.${stateLabel}`) : '—'}</dd>
      </div>
    </dl>
  )
}

export default ElectionStats
