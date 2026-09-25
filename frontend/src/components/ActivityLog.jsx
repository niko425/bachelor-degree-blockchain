import { ELECTION_STATES } from '../lib/constants'

function describeActivity(entry, candidates) {
  if (entry.eventName === 'VoteCast') {
    const name = candidates?.[entry.candidateId]?.name ?? `candidate #${entry.candidateId}`
    return `Vote cast for ${name}`
  }

  const newState = ELECTION_STATES[entry.newState]
  if (newState === 'Voting') {
    return 'Voting opened'
  }
  if (newState === 'Ended') {
    return 'Voting closed'
  }
  return `Election state changed to ${newState}`
}

function formatBlockTime(timestamp) {
  return new Date(timestamp * 1000).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function ActivityLog({ account, activity, activityLoading, activityError, candidates }) {
  if (!account) {
    return null
  }

  return (
    <section aria-labelledby="activity-log-heading">
      <h2 id="activity-log-heading">Activity log</h2>

      {activityLoading && <p>Loading activity...</p>}

      {activityError && <p role="alert">{activityError}</p>}

      {!activityLoading && activity && activity.length === 0 && <p>No activity yet.</p>}

      {activity && activity.length > 0 && (
        <ul className="activity-log">
          {activity.map((entry) => (
            <li key={entry.key}>
              <time className="activity-time" dateTime={new Date(entry.timestamp * 1000).toISOString()}>
                {formatBlockTime(entry.timestamp)}
              </time>
              <span>{describeActivity(entry, candidates)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default ActivityLog
