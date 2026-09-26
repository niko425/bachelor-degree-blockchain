import { useTranslation } from 'react-i18next'

function CandidateList({
  account,
  candidates,
  candidatesError,
  votingFor,
  voteError,
  lastVotedId,
  stateLabel,
  onVote,
  onTickEnd,
}) {
  const { t } = useTranslation()

  return (
    <>
      {account && !candidates && !candidatesError && <p>{t('candidates.loading')}</p>}

      {candidatesError && <p role="alert">{candidatesError}</p>}

      {candidates && candidates.length === 0 && <p>{t('candidates.empty')}</p>}

      {candidates && candidates.length > 0 && (
        <ul className="candidate-list">
          {candidates.map((c, i) => (
            <li key={i}>
              <span>{c.name}</span>
              <span
                className={i === lastVotedId ? 'vote-count vote-tick' : 'vote-count'}
                onAnimationEnd={onTickEnd}
              >
                {t('candidates.votes', { count: Number(c.voteCount) })}
              </span>
              <button
                type="button"
                className="button-seal"
                onClick={() => onVote(i)}
                disabled={votingFor !== null || stateLabel !== 'Voting'}
              >
                {votingFor === i ? t('candidates.voting') : t('candidates.vote')}
              </button>
            </li>
          ))}
        </ul>
      )}

      {voteError && <p role="alert">{voteError}</p>}
    </>
  )
}

export default CandidateList
