import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Contract } from 'ethers'
import { BALLOT_ABI, FACTORY_ABI, FACTORY_ADDRESS, FACTORY_DEPLOY_BLOCK } from '../contract'
import { ELECTION_STATES } from '../lib/constants'
import { describeAdminError } from '../lib/errors'
import { queryFilterInChunks } from '../lib/events'
import { isOnSepolia } from './useWallet'

export function useElections() {
  const { t } = useTranslation()
  const tRef = useRef(t)

  useEffect(() => {
    tRef.current = t
  }, [t])

  const [elections, setElections] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [owner, setOwner] = useState(null)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState(null)
  const [createNotice, setCreateNotice] = useState(null)

  const loadElections = useCallback(async (provider) => {
    setError(null)
    setLoading(true)
    try {
      if (!(await isOnSepolia(provider))) {
        setError(tRef.current('errors.wrongNetwork'))
        return
      }

      const factory = new Contract(FACTORY_ADDRESS, FACTORY_ABI, provider)
      const latestBlock = await provider.getBlockNumber()
      const [factoryOwner, addresses, created] = await Promise.all([
        factory.owner(),
        factory.getElections(),
        queryFilterInChunks(factory, factory.filters.ElectionCreated(), FACTORY_DEPLOY_BLOCK, latestBlock),
      ])

      const createdByAddress = new Map(created.map((e) => [e.args.election.toLowerCase(), e]))

      const list = await Promise.all(
        addresses.map(async (electionAddress) => {
          const event = createdByAddress.get(electionAddress.toLowerCase())
          const ballot = new Contract(electionAddress, BALLOT_ABI, provider)
          const [title, state, approved, votes] = await Promise.all([
            event ? event.args.title : ballot.title(),
            ballot.state(),
            ballot.approvedVoterCount(),
            ballot.totalVotes(),
          ])

          return {
            address: electionAddress,
            title,
            state: Number(state),
            stateLabel: ELECTION_STATES[Number(state)],
            approvedVoterCount: Number(approved),
            totalVotes: Number(votes),
            createdBlock: event ? event.blockNumber : FACTORY_DEPLOY_BLOCK,
          }
        })
      )

      setOwner(factoryOwner)
      setElections(list)
    } catch (err) {
      const reason = err.error?.message ?? err.info?.error?.message ?? err.shortMessage ?? err.message
      setError(tRef.current('electionList.loadFailed', { reason }))
    } finally {
      setLoading(false)
    }
  }, [])

  async function createElection(provider, rawTitle) {
    setCreateError(null)
    setCreateNotice(null)
    setCreating(true)
    try {
      const title = rawTitle.trim()
      const signer = await provider.getSigner()
      const factory = new Contract(FACTORY_ADDRESS, FACTORY_ABI, signer)

      const tx = await factory.createElection(title)
      await tx.wait()

      setCreateNotice(t('electionList.created', { title }))
      await loadElections(provider)
      return true
    } catch (err) {
      setCreateError(describeAdminError(err, t))
      return false
    } finally {
      setCreating(false)
    }
  }

  return {
    elections,
    loading,
    error,
    owner,
    creating,
    createError,
    createNotice,
    loadElections,
    createElection,
  }
}
