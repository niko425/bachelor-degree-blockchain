const EMPTY = '—'

function formatPercent(ratio, locale) {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(ratio)
}

export function formatCount(value, locale) {
  if (value === null || value === undefined) {
    return EMPTY
  }

  return new Intl.NumberFormat(locale).format(Number(value))
}

export function formatTurnout(votesCast, registeredVoters, locale) {
  if (votesCast === null || votesCast === undefined || !registeredVoters) {
    return EMPTY
  }

  return formatPercent(Number(votesCast) / Number(registeredVoters), locale)
}

export function formatShare(votes, votesCast, locale) {
  if (!votesCast) {
    return EMPTY
  }

  return formatPercent(Number(votes) / Number(votesCast), locale)
}

export function formatDateTime(timestamp, locale) {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(timestamp * 1000)
  )
}
