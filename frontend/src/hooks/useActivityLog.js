import { useCallback, useState } from 'react'
import { Contract } from 'ethers'
import { BALLOT_ABI, FACTORY_DEPLOY_BLOCK } from '../contract'
import { queryFilterInChunks } from '../lib/events'
import { isOnSepolia } from './useWallet'

export function useActivityLog(electionAddress, fromBlock) {
  const [activity, setActivity] = useState(null)
  const [activityLoading, setActivityLoading] = useState(false)
  const [activityError, setActivityError] = useState(null)

  const loadActivity = useCallback(
    async (provider) => {
      setActivityError(null)
      setActivityLoading(true)
      try {
        if (!(await isOnSepolia(provider))) {
          return
        }

        const ballot = new Contract(electionAddress, BALLOT_ABI, provider)
        const latestBlock = await provider.getBlockNumber()
        const startBlock = fromBlock ?? FACTORY_DEPLOY_BLOCK
        const [votes, stateChanges] = await Promise.all([
          queryFilterInChunks(ballot, ballot.filters.VoteCast(), startBlock, latestBlock),
          queryFilterInChunks(ballot, ballot.filters.StateChanged(), startBlock, latestBlock),
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
    },
    [electionAddress, fromBlock]
  )

  return { activity, activityLoading, activityError, loadActivity }
}
