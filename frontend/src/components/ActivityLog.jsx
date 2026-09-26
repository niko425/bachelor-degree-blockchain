import { useTranslation } from 'react-i18next'
import { ELECTION_STATES } from '../lib/constants'
import { formatDateTime } from '../lib/format'
import { localeFor } from '../lib/i18n'

function describeActivity(entry, candidates, t) {
  if (entry.eventName === 'VoteCast') {
    const name =
      candidates?.[entry.candidateId]?.name ?? t('activity.unknownCandidate', { id: entry.candidateId })
    return t('activity.voteCast', { name })
  }

  const newState = ELECTION_STATES[entry.newState]
  if (newState === 'Voting') {
    return t('activity.votingOpened')
  }
  if (newState === 'Ended') {
    return t('activity.votingClosed')
  }
  return t('activity.stateChanged', { state: t(`state.${newState}`) })
}

function ActivityLog({ account, activity, activityLoading, activityError, candidates }) {
  const { t, i18n } = useTranslation()
  const locale = localeFor(i18n.language)

  if (!account) {
    return null
  }

  return (
    <section aria-labelledby="activity-log-heading">
      <h2 id="activity-log-heading">{t('activity.heading')}</h2>

      {activityLoading && <p>{t('activity.loading')}</p>}

      {activityError && <p role="alert">{activityError}</p>}

      {!activityLoading && activity && activity.length === 0 && <p>{t('activity.empty')}</p>}

      {activity && activity.length > 0 && (
        <ul className="activity-log">
          {activity.map((entry) => (
            <li key={entry.key}>
              <time className="activity-time" dateTime={new Date(entry.timestamp * 1000).toISOString()}>
                {formatDateTime(entry.timestamp, locale)}
              </time>
              <span>{describeActivity(entry, candidates, t)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default ActivityLog
