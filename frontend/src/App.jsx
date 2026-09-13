import { useState } from 'react'
import { BrowserProvider, Contract } from 'ethers'
import { BALLOT_ADDRESS, BALLOT_ABI } from './contract'
import './App.css'

const SEPOLIA_CHAIN_ID = 11155111n

// Turns an ethers/MetaMask error from vote() into a message for the user.
// The quoted strings must match the require() messages in contracts/Ballot.sol.
function describeVoteError(err) {
  // ethers wraps MetaMask's 4001 "user rejected" as ACTION_REJECTED
  if (err.code === 'ACTION_REJECTED' || err.code === 4001 || err.info?.error?.code === 4001) {
    return 'You rejected the transaction in MetaMask, so no vote was cast.'
  }

  // Depending on the wallet and RPC node, the revert reason can end up in different fields
  const details = [err.reason, err.shortMessage, err.info?.error?.message, err.error?.message, err.message]
    .filter(Boolean)
    .join(' ')

  if (details.includes('You have already voted')) {
    return 'You have already voted in this election. Each approved wallet can vote only once.'
  }
  if (details.includes('You are not approved to vote')) {
    return 'This wallet is not an approved voter. Ask the election admin to approve your address.'
  }
  if (details.includes('Action not allowed in current election state')) {
    return 'Voting is not open right now.'
  }
  if (err.code === 'INSUFFICIENT_FUNDS') {
    return 'This wallet does not have enough Sepolia ETH to pay the transaction fee.'
  }
  if (err.code === 'NETWORK_ERROR') {
    return 'MetaMask switched networks. Switch back to Sepolia, reload the page and connect again.'
  }
  return `Vote failed: ${err.shortMessage ?? err.message}`
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

      await loadCandidates(browserProvider)
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

      await loadCandidates(provider)
    } catch (err) {
      setVoteError(describeVoteError(err))
    } finally {
      setVotingFor(null)
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
    </section>
  )
}

export default App
