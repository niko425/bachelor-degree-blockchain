import { useState } from 'react'
import { BrowserProvider, Contract, isAddress } from 'ethers'
import { BALLOT_ADDRESS, BALLOT_ABI, BALLOT_DEPLOY_BLOCK } from './contract'
import './App.css'

const SEPOLIA_CHAIN_ID = 11155111n

const ELECTION_STATES = ['Setup', 'Voting', 'Ended']

const MIN_LOG_RANGE = 10

function isUserRejection(err) {
  return err.code === 'ACTION_REJECTED' || err.code === 4001 || err.info?.error?.code === 4001
}

function errorDetails(err) {
  return [err.reason, err.shortMessage, err.info?.error?.message, err.error?.message, err.message]
    .filter(Boolean)
    .join(' ')
}

function describeWalletError(err) {
  if (err.code === 'INSUFFICIENT_FUNDS') {
    return 'This wallet does not have enough Sepolia ETH to pay the transaction fee.'
  }
  if (err.code === 'NETWORK_ERROR') {
    return 'MetaMask switched networks. Switch back to Sepolia, reload the page and connect again.'
  }
  return null
}

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

function App() {
  const [account, setAccount] = useState(null)
  const [provider, setProvider] = useState(null)
  const [error, setError] = useState(null)
  const [connecting, setConnecting] = useState(false)
  const [candidates, setCandidates] = useState(null)
  const [candidatesError, setCandidatesError] = useState(null)
  const [votingFor, setVotingFor] = useState(null)
  const [voteError, setVoteError] = useState(null)
  const [lastVotedId, setLastVotedId] = useState(null)

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
      await window.ethereum.request({ method: 'eth_requestAccounts' })

      const browserProvider = new BrowserProvider(window.ethereum)
      const signer = await browserProvider.getSigner()
      setAccount(await signer.getAddress())
      setProvider(browserProvider)

      await Promise.all([loadCandidates(browserProvider), loadElectionInfo(browserProvider)])
      await loadActivity(browserProvider)
    } catch (err) {
      setError(err.code === 4001 ? 'Connection request was rejected.' : err.message)
    } finally {
      setConnecting(false)
    }
  }

  async function loadCandidates(provider) {
    setCandidatesError(null)
    try {
      const { chainId } = await provider.getNetwork()
      if (chainId !== SEPOLIA_CHAIN_ID) {
        setCandidatesError('MetaMask is not on the Sepolia network. Switch to Sepolia, reload the page and connect again.')
        return
      }

      const ballot = new Contract(BALLOT_ADDRESS, BALLOT_ABI, provider)
      const results = await ballot.getResults()

      setCandidates(results.map((c) => ({ name: c.name, voteCount: c.voteCount.toString() })))
    } catch (err) {
      setCandidatesError(`Could not load candidates from the contract: ${err.shortMessage ?? err.message}`)
    }
  }

  async function loadElectionInfo(provider) {
    try {
      const { chainId } = await provider.getNetwork()
      if (chainId !== SEPOLIA_CHAIN_ID) {
        return
      }

      const ballot = new Contract(BALLOT_ADDRESS, BALLOT_ABI, provider)
      const [admin, state, count] = await Promise.all([ballot.admin(), ballot.state(), ballot.candidateCount()])

      setAdminAddress(admin)
      setElectionState(Number(state))
      setCandidateCount(Number(count))
    } catch (err) {
      setAdminError(`Could not load election details from the contract: ${err.shortMessage ?? err.message}`)
    }
  }

  async function loadActivity(provider) {
    setActivityError(null)
    setActivityLoading(true)
    try {
      const { chainId } = await provider.getNetwork()
      if (chainId !== SEPOLIA_CHAIN_ID) {
        return
      }

      const ballot = new Contract(BALLOT_ADDRESS, BALLOT_ABI, provider)
      const latestBlock = await provider.getBlockNumber()
      const [votes, stateChanges] = await Promise.all([
        queryFilterInChunks(ballot, ballot.filters.VoteCast(), BALLOT_DEPLOY_BLOCK, latestBlock),
        queryFilterInChunks(ballot, ballot.filters.StateChanged(), BALLOT_DEPLOY_BLOCK, latestBlock),
      ])

      const events = [...votes, ...stateChanges].sort((a, b) => a.blockNumber - b.blockNumber || a.index - b.index)

      const blockNumbers = [...new Set(events.map((e) => e.blockNumber))]
      const blocks = await Promise.all(blockNumbers.map((blockNumber) => provider.getBlock(blockNumber)))
      const timestamps = new Map(blocks.map((block) => [block.number, block.timestamp]))

      setActivity(events.map((e) => ({
        key: `${e.transactionHash}-${e.index}`,
        eventName: e.eventName,
        candidateId: e.eventName === 'VoteCast' ? Number(e.args.candidateId) : null,
        newState: e.eventName === 'StateChanged' ? Number(e.args.newState) : null,
        timestamp: timestamps.get(e.blockNumber),
      })))
    } catch (err) {
      const reason = err.error?.message ?? err.info?.error?.message ?? err.shortMessage ?? err.message
      setActivityError(`Could not load the activity log: ${reason}`)
    } finally {
      setActivityLoading(false)
    }
  }

  async function castVote(candidateId) {
    setVoteError(null)
    setLastVotedId(null)
    setVotingFor(candidateId)
    try {
      const signer = await provider.getSigner()
      const ballot = new Contract(BALLOT_ADDRESS, BALLOT_ABI, signer)

      const tx = await ballot.vote(candidateId)

      await tx.wait()

      const activityLoaded = loadActivity(provider)
      await loadCandidates(provider)
      setLastVotedId(candidateId)
      await activityLoaded
    } catch (err) {
      setVoteError(describeVoteError(err))
    } finally {
      setVotingFor(null)
    }
  }

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
      <h1>Blockchain voting</h1>

      <dl className="credential">
        <dt>Contract</dt>
        <dd>{BALLOT_ADDRESS}</dd>
        <dt>Network</dt>
        <dd>Sepolia</dd>
      </dl>

      <span className="contract-watermark" aria-hidden="true">VERIFIABLE</span>

      {account ? (
        <p>
          Connected wallet: <code>{account}</code>
        </p>
      ) : (
        <button
          type="button"
          onClick={connectWallet}
          disabled={connecting}
        >
          {connecting ? 'Connecting...' : 'Connect wallet'}
        </button>
      )}

      {error && <p role="alert">{error}</p>}

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
                onAnimationEnd={() => setLastVotedId(null)}
              >
                {c.voteCount} {c.voteCount === '1' ? 'vote' : 'votes'}
              </span>
              <button
                type="button"
                className="button-seal"
                onClick={() => castVote(i)}
                disabled={votingFor !== null || stateLabel !== 'Voting'}
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
      )}

      {isAdmin && (
        <fieldset className="admin-panel" disabled={adminAction !== null}>
          <legend>Admin panel</legend>

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
                <button type="submit" className="button-seal">
                  {adminAction === 'addCandidate' ? 'Adding...' : 'Add candidate'}
                </button>
              </form>

              <form onSubmit={handleApproveVoter}>
                <label>
                  Voter address{' '}
                  <input
                    type="text"
                    className="address-input"
                    placeholder="0x..."
                    value={newVoterAddress}
                    onChange={(e) => setNewVoterAddress(e.target.value)}
                  />
                </label>{' '}
                <button type="submit" className="button-seal">
                  {adminAction === 'approveVoter' ? 'Approving...' : 'Approve voter'}
                </button>
              </form>

              <button
                type="button"
                className="button-seal"
                onClick={() => runAdminAction('startVoting', (ballot) => ballot.startVoting(), 'Voting is now open.')}
                disabled={candidateCount === 0}
              >
                {adminAction === 'startVoting' ? 'Starting...' : 'Start voting'}
              </button>
              {candidateCount === 0 && <p className="helper-text">Add at least one candidate before starting voting.</p>}
            </>
          )}

          {stateLabel === 'Voting' && (
            <button
              type="button"
              className="button-seal"
              onClick={() => runAdminAction('endVoting', (ballot) => ballot.endVoting(), 'Voting has been closed.')}
            >
              {adminAction === 'endVoting' ? 'Ending...' : 'End voting'}
            </button>
          )}

          {stateLabel === 'Ended' && <p>Voting has ended, showing final results</p>}

          {adminNotice && <p className="notice-success">{adminNotice}</p>}
          {adminError && <p role="alert">{adminError}</p>}
        </fieldset>
      )}
    </section>
  )
}

export default App
