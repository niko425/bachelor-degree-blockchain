import { useState } from 'react'
import { BrowserProvider } from 'ethers'
import { SEPOLIA_CHAIN_ID } from '../lib/constants'

export async function isOnSepolia(provider) {
  const { chainId } = await provider.getNetwork()
  return chainId === SEPOLIA_CHAIN_ID
}

export function useWallet() {
  const [account, setAccount] = useState(null)
  const [provider, setProvider] = useState(null)
  const [error, setError] = useState(null)
  const [connecting, setConnecting] = useState(false)

  async function connect(onConnected) {
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

      await onConnected(browserProvider)
    } catch (err) {
      setError(err.code === 4001 ? 'Connection request was rejected.' : err.message)
    } finally {
      setConnecting(false)
    }
  }

  return { account, provider, error, connecting, connect }
}
