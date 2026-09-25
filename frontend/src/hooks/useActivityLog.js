import { useState } from 'react'
import { Contract } from 'ethers'
import { BALLOT_ADDRESS, BALLOT_ABI, BALLOT_DEPLOY_BLOCK } from '../contract'
import { isOnSepolia } from './useWallet'

const MIN_LOG_RANGE = 10

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

export function useActivityLog() {
  const [activity, setActivity] = useState(null)
  const [activityLoading, setActivityLoading] = useState(false)
  const [activityError, setActivityError] = useState(null)

  async function loadActivity(provider) {
    setActivityError(null)
    setActivityLoading(true)
    try {
      if (!(await isOnSepolia(provider))) {
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

  return { activity, activityLoading, activityError, loadActivity }
}
