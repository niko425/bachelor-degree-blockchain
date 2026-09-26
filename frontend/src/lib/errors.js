export function isUserRejection(err) {
  return err.code === 'ACTION_REJECTED' || err.code === 4001 || err.info?.error?.code === 4001
}

export function errorDetails(err) {
  return [err.reason, err.shortMessage, err.info?.error?.message, err.error?.message, err.message]
    .filter(Boolean)
    .join(' ')
}

export function describeWalletError(err, t) {
  if (err.code === 'INSUFFICIENT_FUNDS') {
    return t('errors.insufficientFunds')
  }
  if (err.code === 'NETWORK_ERROR') {
    return t('errors.networkChanged')
  }
  return null
}

export function describeVoteError(err, t) {
  if (isUserRejection(err)) {
    return t('errors.rejectedVote')
  }

  const details = errorDetails(err)
  if (details.includes('You have already voted')) {
    return t('errors.alreadyVoted')
  }
  if (details.includes('You are not approved to vote')) {
    return t('errors.notApproved')
  }
  if (details.includes('Action not allowed in current election state')) {
    return t('errors.votingNotOpen')
  }
  return (
    describeWalletError(err, t) ?? t('errors.voteFailed', { reason: err.shortMessage ?? err.message })
  )
}

export function describeAdminError(err, t) {
  if (isUserRejection(err)) {
    return t('errors.rejectedAdmin')
  }

  const details = errorDetails(err)
  if (details.includes('Only owner can create elections')) {
    return t('errors.onlyOwner')
  }
  if (details.includes('Election title cannot be empty')) {
    return t('errors.emptyTitle')
  }
  if (details.includes('Voter already approved')) {
    return t('errors.voterAlreadyApproved')
  }
  if (details.includes('Voter address cannot be zero')) {
    return t('errors.zeroAddress')
  }
  if (details.includes('Only admin can perform this action')) {
    return t('errors.onlyAdmin')
  }
  if (details.includes('Add at least one candidate before starting')) {
    return t('errors.needCandidateFirst')
  }
  if (details.includes('Action not allowed in current election state')) {
    return t('errors.wrongState')
  }
  return (
    describeWalletError(err, t) ?? t('errors.adminFailed', { reason: err.shortMessage ?? err.message })
  )
}
