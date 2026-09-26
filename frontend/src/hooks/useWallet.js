import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BrowserProvider, getAddress } from 'ethers'
import { SEPOLIA_CHAIN_ID } from '../lib/constants'

export async function isOnSepolia(provider) {
  const { chainId } = await provider.getNetwork()
  return chainId === SEPOLIA_CHAIN_ID
}

export function useWallet() {
  const { t } = useTranslation()
  const [account, setAccount] = useState(null)
  const [provider, setProvider] = useState(null)
  const [error, setError] = useState(null)
  const [connecting, setConnecting] = useState(false)

  async function connect(onConnected) {
    setError(null)

    if (!window.ethereum) {
      setError(t('wallet.notDetected'))
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
      setError(err.code === 4001 ? t('wallet.rejected') : err.message)
    } finally {
      setConnecting(false)
    }
  }

  useEffect(() => {
    if (!window.ethereum || account === null) {
      return
    }

    function handleAccountsChanged(accounts) {
      if (accounts.length === 0) {
        setAccount(null)
        setProvider(null)
        setError(null)
        return
      }

      setError(null)
      setAccount(getAddress(accounts[0]))
      setProvider(new BrowserProvider(window.ethereum))
    }

    function handleChainChanged() {
      window.location.reload()
    }

    window.ethereum.on('accountsChanged', handleAccountsChanged)
    window.ethereum.on('chainChanged', handleChainChanged)

    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
      window.ethereum.removeListener('chainChanged', handleChainChanged)
    }
  }, [account])

  return { account, provider, error, connecting, connect }
}
