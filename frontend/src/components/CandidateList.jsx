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
  return (
    <>
      {account && !candidates && !candidatesError && <p>Loading candidates...</p>}

      {candidatesError && <p role="alert">{candidatesError}</p>}

      {candidates && candidates.length === 0 && <p>No candidates have been added yet.</p>}

      {candidates && candidates.length > 0 && (
        <ul className="candidate-list">
          {candidates.map((c, i) => (
            <li key={i}>
              <span>{c.name}</span>
              <span
                className={i === lastVotedId ? 'vote-count vote-tick' : 'vote-count'}
                onAnimationEnd={onTickEnd}
              >
                {c.voteCount} {c.voteCount === '1' ? 'vote' : 'votes'}
              </span>
              <button
                type="button"
                className="button-seal"
                onClick={() => onVote(i)}
                disabled={votingFor !== null || stateLabel !== 'Voting'}
              >
                {votingFor === i ? 'Voting...' : 'Vote'}
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
