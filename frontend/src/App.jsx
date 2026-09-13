import { useState } from 'react'
import { BrowserProvider, Contract } from 'ethers'
import { BALLOT_ADDRESS, BALLOT_ABI } from './contract'
import './App.css'

const SEPOLIA_CHAIN_ID = 11155111n

function App() {
  const [account, setAccount] = useState(null)
  const [error, setError] = useState(null)
  const [connecting, setConnecting] = useState(false)
  const [candidates, setCandidates] = useState(null)
  const [candidatesError, setCandidatesError] = useState(null)

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

      const provider = new BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      setAccount(await signer.getAddress())

      await loadCandidates(provider)
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
              {c.name}: {c.voteCount} {c.voteCount === '1' ? 'vote' : 'votes'}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default App
