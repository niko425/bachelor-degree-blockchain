import { useState } from 'react'
import { BrowserProvider } from 'ethers'
import './App.css'

function App() {
  const [account, setAccount] = useState(null)
  const [error, setError] = useState(null)
  const [connecting, setConnecting] = useState(false)

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
    } catch (err) {
      // 4001 = user rejected the request in MetaMask
      setError(err.code === 4001 ? 'Connection request was rejected.' : err.message)
    } finally {
      setConnecting(false)
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
    </section>
  )
}

export default App
