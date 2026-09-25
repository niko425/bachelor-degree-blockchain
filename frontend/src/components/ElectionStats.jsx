import { formatCount, formatTurnout } from '../lib/format'

function ElectionStats({ approvedVoterCount, totalVotes, candidateCount, stateLabel }) {
  return (
    <dl className="stats">
      <div>
        <dt>Registered voters</dt>
        <dd>{formatCount(approvedVoterCount)}</dd>
      </div>
      <div>
        <dt>Votes cast</dt>
        <dd>{formatCount(totalVotes)}</dd>
      </div>
      <div>
        <dt>Turnout</dt>
        <dd>{formatTurnout(totalVotes, approvedVoterCount)}</dd>
      </div>
      <div>
        <dt>Candidates</dt>
        <dd>{formatCount(candidateCount)}</dd>
      </div>
      <div>
        <dt>State</dt>
        <dd>{formatCount(stateLabel)}</dd>
      </div>
    </dl>
  )
}

export default ElectionStats
