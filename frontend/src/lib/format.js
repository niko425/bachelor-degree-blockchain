export function formatCount(value) {
  if (value === null || value === undefined) {
    return '—'
  }

  return String(value)
}

export function formatTurnout(votesCast, registeredVoters) {
  if (votesCast === null || votesCast === undefined || !registeredVoters) {
    return '—'
  }

  return `${((Number(votesCast) / Number(registeredVoters)) * 100).toFixed(1)}%`
}

export function formatShare(votes, votesCast) {
  if (!votesCast) {
    return '—'
  }

  return `${((Number(votes) / Number(votesCast)) * 100).toFixed(1)}%`
}
