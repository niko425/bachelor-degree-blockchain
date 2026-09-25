export function isUserRejection(err) {
  return err.code === 'ACTION_REJECTED' || err.code === 4001 || err.info?.error?.code === 4001
}

export function errorDetails(err) {
  return [err.reason, err.shortMessage, err.info?.error?.message, err.error?.message, err.message]
    .filter(Boolean)
    .join(' ')
}

export function describeWalletError(err) {
  if (err.code === 'INSUFFICIENT_FUNDS') {
    return 'This wallet does not have enough Sepolia ETH to pay the transaction fee.'
  }
  if (err.code === 'NETWORK_ERROR') {
    return 'MetaMask switched networks. Switch back to Sepolia, reload the page and connect again.'
  }
  return null
}

export function describeVoteError(err) {
  if (isUserRejection(err)) {
    return 'You rejected the transaction in MetaMask, so no vote was cast.'
  }

  const details = errorDetails(err)
  if (details.includes('You have already voted')) {
    return 'You have already voted in this election. Each approved wallet can vote only once.'
  }
  if (details.includes('You are not approved to vote')) {
    return 'This wallet is not an approved voter. Ask the election admin to approve your address.'
  }
  if (details.includes('Action not allowed in current election state')) {
    return 'Voting is not open right now.'
  }
  return describeWalletError(err) ?? `Vote failed: ${err.shortMessage ?? err.message}`
}

export function describeAdminError(err) {
  if (isUserRejection(err)) {
    return 'You rejected the transaction in MetaMask, so nothing was changed.'
  }

  const details = errorDetails(err)
  if (details.includes('Only admin can perform this action')) {
    return 'Only the election admin can do this. Check that MetaMask is still on the admin account.'
  }
  if (details.includes('Add at least one candidate before starting')) {
    return 'Add at least one candidate before starting voting.'
  }
  if (details.includes('Action not allowed in current election state')) {
    return 'This action is not allowed in the current election state. Reload the page to see the latest state.'
  }
  return describeWalletError(err) ?? `Admin action failed: ${err.shortMessage ?? err.message}`
}
