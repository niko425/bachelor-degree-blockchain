import { useState } from 'react'
import { BrowserProvider, Contract, isAddress } from 'ethers'
import { BALLOT_ADDRESS, BALLOT_ABI, BALLOT_DEPLOY_BLOCK } from './contract'
import './App.css'

const SEPOLIA_CHAIN_ID = 11155111n

// Same order as the ElectionState enum in contracts/Ballot.sol
const ELECTION_STATES = ['Setup', 'Voting', 'Ended']

// Smallest block range queryFilterInChunks will split a failing event query down to
const MIN_LOG_RANGE = 10

// ethers wraps MetaMask's 4001 "user rejected" as ACTION_REJECTED
function isUserRejection(err) {
  return err.code === 'ACTION_REJECTED' || err.code === 4001 || err.info?.error?.code === 4001
}

// Depending on the wallet and RPC node, the revert reason can end up in different fields
function errorDetails(err) {
  return [err.reason, err.shortMessage, err.info?.error?.message, err.error?.message, err.message]
    .filter(Boolean)
    .join(' ')
}

// Problems that can happen with any transaction, not just one contract function; null if neither applies
function describeWalletError(err) {
  if (err.code === 'INSUFFICIENT_FUNDS') {
    return 'This wallet does not have enough Sepolia ETH to pay the transaction fee.'
  }
  if (err.code === 'NETWORK_ERROR') {
    return 'MetaMask switched networks. Switch back to Sepolia, reload the page and connect again.'
  }
  return null
}

// Turns an ethers/MetaMask error from vote() into a message for the user.
// The quoted strings must match the require() messages in contracts/Ballot.sol.
function describeVoteError(err) {
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

// Same as describeVoteError, for the admin-only functions
function describeAdminError(err) {
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

// Some RPC providers cap the block range of one event query (Alchemy's free tier allows only 10 blocks).
// If the query fails, split the range in half and query each half, down to MIN_LOG_RANGE blocks;
// if a range that small still fails, the error is not about the range and is passed on.
async function queryFilterInChunks(contract, filter, fromBlock, toBlock) {
  try {
    return await contract.queryFilter(filter, fromBlock, toBlock)
  } catch (err) {
    if (toBlock - fromBlock + 1 <= MIN_LOG_RANGE) {
      throw err
    }
    const middle = Math.floor((fromBlock + toBlock) / 2)
    const firstHalf = await queryFilterInChunks(contract, filter, fromBlock, middle)
    const secondHalf = await queryFilterInChunks(contract, filter, middle + 1, toBlock)
    return [...firstHalf, ...secondHalf]
  }
}

// Turns one activity entry into a readable line
function describeActivity(entry, candidates) {
  if (entry.eventName === 'VoteCast') {
    // Candidate IDs are indexes into the array returned by getResults()
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

// Block timestamps are in seconds
function formatBlockTime(timestamp) {
  return new Date(timestamp * 1000).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function App() {
  const [account, setAccount] = useState(null)
  const [provider, setProvider] = useState(null)
  const [error, setError] = useState(null)
  const [connecting, setConnecting] = useState(false)
  const [candidates, setCandidates] = useState(null)
  const [candidatesError, setCandidatesError] = useState(null)
  const [votingFor, setVotingFor] = useState(null)
  const [voteError, setVoteError] = useState(null)

  const [adminAddress, setAdminAddress] = useState(null)
  const [electionState, setElectionState] = useState(null)
  const [candidateCount, setCandidateCount] = useState(null)
  const [adminAction, setAdminAction] = useState(null)
  const [adminError, setAdminError] = useState(null)
  const [adminNotice, setAdminNotice] = useState(null)
  const [newCandidateName, setNewCandidateName] = useState('')
  const [newVoterAddress, setNewVoterAddress] = useState('')

  const [activity, setActivity] = useState(null)
  const [activityLoading, setActivityLoading] = useState(false)
  const [activityError, setActivityError] = useState(null)

  const isAdmin = account !== null && adminAddress !== null && account.toLowerCase() === adminAddress.toLowerCase()
  const stateLabel = ELECTION_STATES[electionState]

  async function connectWallet() {
    setError(null)

    if (!window.ethereum) {
      setError('MetaMask not detected. Install the MetaMask extension and reload the page.')
      return
    }

    setConnecting(true)
    try {
      // Opens the MetaMask popup asking the user to share an account with this site
      await window.ethereum.request({ method: 'eth_requestAccounts' })

      const browserProvider = new BrowserProvider(window.ethereum)
      const signer = await browserProvider.getSigner()
      setAccount(await signer.getAddress())
      setProvider(browserProvider)

      await Promise.all([loadCandidates(browserProvider), loadElectionInfo(browserProvider)])
      await loadActivity(browserProvider)
    } catch (err) {
      // 4001 = user rejected the request in MetaMask
      setError(err.code === 4001 ? 'Connection request was rejected.' : err.message)
    } finally {
      setConnecting(false)
    }
  }

  async function loadCandidates(provider) {
    setCandidatesError(null)
    try {
      // On any other network there is no contract at BALLOT_ADDRESS, and ethers
      // would only report an unhelpful "could not decode result data" error
      const { chainId } = await provider.getNetwork()
      if (chainId !== SEPOLIA_CHAIN_ID) {
        setCandidatesError('MetaMask is not on the Sepolia network. Switch to Sepolia, reload the page and connect again.')
        return
      }

      const ballot = new Contract(BALLOT_ADDRESS, BALLOT_ABI, provider)
      const results = await ballot.getResults()

      // voteCount comes back as a BigInt, so convert it for rendering
      setCandidates(results.map((c) => ({ name: c.name, voteCount: c.voteCount.toString() })))
    } catch (err) {
      setCandidatesError(`Could not load candidates from the contract: ${err.shortMessage ?? err.message}`)
    }
  }

  async function loadElectionInfo(provider) {
    try {
      // loadCandidates already shows the wrong-network message, so there is nothing to add here
      const { chainId } = await provider.getNetwork()
      if (chainId !== SEPOLIA_CHAIN_ID) {
        return
      }

      const ballot = new Contract(BALLOT_ADDRESS, BALLOT_ABI, provider)
      const [admin, state, count] = await Promise.all([ballot.admin(), ballot.state(), ballot.candidateCount()])

      setAdminAddress(admin)
      // state and candidateCount come back as BigInt
      setElectionState(Number(state))
      setCandidateCount(Number(count))
    } catch (err) {
      // Only visible inside the admin panel, so non-admin users see nothing extra
      setAdminError(`Could not load election details from the contract: ${err.shortMessage ?? err.message}`)
    }
  }

  async function loadActivity(provider) {
    setActivityError(null)
    setActivityLoading(true)
    try {
      // loadCandidates already shows the wrong-network message, so there is nothing to add here
      const { chainId } = await provider.getNetwork()
      if (chainId !== SEPOLIA_CHAIN_ID) {
        return
      }

      const ballot = new Contract(BALLOT_ADDRESS, BALLOT_ABI, provider)
      // A fixed block number (not 'latest') so both queries and the range splitting cover the same blocks
      const latestBlock = await provider.getBlockNumber()
      const [votes, stateChanges] = await Promise.all([
        queryFilterInChunks(ballot, ballot.filters.VoteCast(), BALLOT_DEPLOY_BLOCK, latestBlock),
        queryFilterInChunks(ballot, ballot.filters.StateChanged(), BALLOT_DEPLOY_BLOCK, latestBlock),
      ])

      // Chronological: by block, then by the log's position within the block
      const events = [...votes, ...stateChanges].sort((a, b) => a.blockNumber - b.blockNumber || a.index - b.index)

      // One getBlock call per distinct block, since several events can share a block
      const blockNumbers = [...new Set(events.map((e) => e.blockNumber))]
      const blocks = await Promise.all(blockNumbers.map((blockNumber) => provider.getBlock(blockNumber)))
      const timestamps = new Map(blocks.map((block) => [block.number, block.timestamp]))

      // The voter address from VoteCast is deliberately not kept: the log shows which
      // candidate got a vote, not who cast it
      setActivity(events.map((e) => ({
        key: `${e.transactionHash}-${e.index}`,
        eventName: e.eventName,
        candidateId: e.eventName === 'VoteCast' ? Number(e.args.candidateId) : null,
        newState: e.eventName === 'StateChanged' ? Number(e.args.newState) : null,
        timestamp: timestamps.get(e.blockNumber),
      })))
    } catch (err) {
      // The RPC's own message (e.g. a provider's block-range limit) is more useful than ethers' generic one
      const reason = err.error?.message ?? err.info?.error?.message ?? err.shortMessage ?? err.message
      setActivityError(`Could not load the activity log: ${reason}`)
    } finally {
      setActivityLoading(false)
    }
  }

  async function castVote(candidateId) {
    setVoteError(null)
    setVotingFor(candidateId)
    try {
      // Sending a transaction needs a signer; the provider alone can only read
      const signer = await provider.getSigner()
      const ballot = new Contract(BALLOT_ADDRESS, BALLOT_ABI, signer)

      // ethers estimates gas first, so a vote that would revert fails here before MetaMask opens
      const tx = await ballot.vote(candidateId)

      // Wait until the transaction is mined on Sepolia
      await tx.wait()

      await Promise.all([loadCandidates(provider), loadActivity(provider)])
    } catch (err) {
      setVoteError(describeVoteError(err))
    } finally {
      setVotingFor(null)
    }
  }

  // Sends one admin transaction with a signer, waits until it is mined, then refreshes the
  // candidate list, election state, candidateCount and activity log. Returns true if the transaction succeeded.
  async function runAdminAction(action, send, successNotice) {
    setAdminError(null)
    setAdminNotice(null)
    setAdminAction(action)
    try {
      const signer = await provider.getSigner()
      const ballot = new Contract(BALLOT_ADDRESS, BALLOT_ABI, signer)

      const tx = await send(ballot)
      await tx.wait()

      setAdminNotice(successNotice)
      await Promise.all([loadCandidates(provider), loadElectionInfo(provider), loadActivity(provider)])
      return true
    } catch (err) {
      setAdminError(describeAdminError(err))
      return false
    } finally {
      setAdminAction(null)
    }
  }

  async function handleAddCandidate(event) {
    event.preventDefault()
    const name = newCandidateName.trim()
    if (!name) {
      setAdminNotice(null)
      setAdminError('Enter a candidate name.')
      return
    }

    if (await runAdminAction('addCandidate', (ballot) => ballot.addCandidate(name), `Added candidate "${name}".`)) {
      setNewCandidateName('')
    }
  }

  async function handleApproveVoter(event) {
    event.preventDefault()
    const address = newVoterAddress.trim()
    // Checked up front: ethers would otherwise try to resolve any other text as an ENS name
    if (!isAddress(address)) {
      setAdminNotice(null)
      setAdminError('Enter a valid wallet address (0x followed by 40 hexadecimal characters), copied exactly.')
      return
    }

    if (await runAdminAction('approveVoter', (ballot) => ballot.approveVoter(address), `Approved voter ${address}.`)) {
      setNewVoterAddress('')
    }
  }

  return (
    <section id="center">
      <h1>Blockchain Voting</h1>

      {account ? (
        <p>
          Connected wallet: <code>{account}</code>
        </p>
      ) : (
        <button
          type="button"
          className="counter"
          onClick={connectWallet}
          disabled={connecting}
        >
          {connecting ? 'Connecting...' : 'Connect Wallet'}
        </button>
      )}

      {error && <p role="alert">{error}</p>}

      {account && !candidates && !candidatesError && <p>Loading candidates...</p>}

      {candidatesError && <p role="alert">{candidatesError}</p>}

      {candidates && candidates.length === 0 && <p>No candidates have been added yet.</p>}

      {candidates && candidates.length > 0 && (
        <ul>
          {/* The array index is the candidate ID in the contract, so it is a stable key */}
          {candidates.map((c, i) => (
            <li key={i}>
              {c.name}: {c.voteCount} {c.voteCount === '1' ? 'vote' : 'votes'}{' '}
              <button
                type="button"
                onClick={() => castVote(i)}
                disabled={votingFor !== null}
              >
                {votingFor === i ? 'Voting...' : 'Vote'}
              </button>
            </li>
          ))}
        </ul>
      )}

      {voteError && <p role="alert">{voteError}</p>}

      {account && (
        <section aria-labelledby="activity-log-heading">
          <h2 id="activity-log-heading">Activity Log</h2>

          {activityLoading && <p>Loading activity...</p>}

          {activityError && <p role="alert">{activityError}</p>}

          {!activityLoading && activity && activity.length === 0 && <p>No activity yet.</p>}

          {activity && activity.length > 0 && (
            <ul>
              {activity.map((entry) => (
                <li key={entry.key}>
                  <time dateTime={new Date(entry.timestamp * 1000).toISOString()}>
                    {formatBlockTime(entry.timestamp)}
                  </time>
                  {': '}
                  {describeActivity(entry, candidates)}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {isAdmin && (
        // Disabling the fieldset disables every input and button inside it while a transaction is pending
        <fieldset disabled={adminAction !== null}>
          <legend>Admin Panel</legend>

          <p>
            Election state: <strong>{stateLabel}</strong>
          </p>

          {stateLabel === 'Setup' && (
            <>
              <form onSubmit={handleAddCandidate}>
                <label>
                  Candidate name{' '}
                  <input
                    type="text"
                    value={newCandidateName}
                    onChange={(e) => setNewCandidateName(e.target.value)}
                  />
                </label>{' '}
                <button type="submit">
                  {adminAction === 'addCandidate' ? 'Adding...' : 'Add Candidate'}
                </button>
              </form>

              <form onSubmit={handleApproveVoter}>
                <label>
                  Voter address{' '}
                  <input
                    type="text"
                    placeholder="0x..."
                    value={newVoterAddress}
                    onChange={(e) => setNewVoterAddress(e.target.value)}
                  />
                </label>{' '}
                <button type="submit">
                  {adminAction === 'approveVoter' ? 'Approving...' : 'Approve Voter'}
                </button>
              </form>

              <button
                type="button"
                onClick={() => runAdminAction('startVoting', (ballot) => ballot.startVoting(), 'Voting is now open.')}
                disabled={candidateCount === 0}
              >
                {adminAction === 'startVoting' ? 'Starting...' : 'Start Voting'}
              </button>
              {candidateCount === 0 && <p>Add at least one candidate before starting voting.</p>}
            </>
          )}

          {stateLabel === 'Voting' && (
            <button
              type="button"
              onClick={() => runAdminAction('endVoting', (ballot) => ballot.endVoting(), 'Voting has been closed.')}
            >
              {adminAction === 'endVoting' ? 'Ending...' : 'End Voting'}
            </button>
          )}

          {stateLabel === 'Ended' && <p>Voting has ended, showing final results</p>}

          {adminNotice && <p>{adminNotice}</p>}
          {adminError && <p role="alert">{adminError}</p>}
        </fieldset>
      )}
    </section>
  )
}

export default App
