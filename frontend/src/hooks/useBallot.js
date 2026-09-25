import { useCallback, useState } from 'react'
import { Contract, isAddress } from 'ethers'
import { BALLOT_ABI } from '../contract'
import { ELECTION_STATES } from '../lib/constants'
import { describeAdminError, describeVoteError } from '../lib/errors'
import { isOnSepolia } from './useWallet'

export function useBallot(provider, electionAddress, loadActivity) {
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

  const stateLabel = ELECTION_STATES[electionState]

  const loadCandidates = useCallback(async (provider) => {
    setCandidatesError(null)
    try {
      if (!(await isOnSepolia(provider))) {
        setCandidatesError('MetaMask is not on the Sepolia network. Switch to Sepolia, reload the page and connect again.')
        return
      }

      const ballot = new Contract(electionAddress, BALLOT_ABI, provider)
      const results = await ballot.getResults()

      setCandidates(results.map((c) => ({ name: c.name, voteCount: c.voteCount.toString() })))
    } catch (err) {
      setCandidatesError(`Could not load candidates from the contract: ${err.shortMessage ?? err.message}`)
    }
  }, [electionAddress])

  const loadElectionInfo = useCallback(async (provider) => {
    try {
      if (!(await isOnSepolia(provider))) {
        return
      }

      const ballot = new Contract(electionAddress, BALLOT_ABI, provider)
      const [admin, state, count] = await Promise.all([ballot.admin(), ballot.state(), ballot.candidateCount()])

      setAdminAddress(admin)
      setElectionState(Number(state))
      setCandidateCount(Number(count))
    } catch (err) {
      setAdminError(`Could not load election details from the contract: ${err.shortMessage ?? err.message}`)
    }
  }, [electionAddress])

  async function castVote(candidateId) {
    setVoteError(null)
    setLastVotedId(null)
    setVotingFor(candidateId)
    try {
      const signer = await provider.getSigner()
      const ballot = new Contract(electionAddress, BALLOT_ABI, signer)

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

  function clearVoteTick() {
    setLastVotedId(null)
  }

  async function runAdminAction(action, send, successNotice) {
    setAdminError(null)
    setAdminNotice(null)
    setAdminAction(action)
    try {
      const signer = await provider.getSigner()
      const ballot = new Contract(electionAddress, BALLOT_ABI, signer)

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

  async function addCandidate(rawName) {
    const name = rawName.trim()
    if (!name) {
      setAdminNotice(null)
      setAdminError('Enter a candidate name.')
      return false
    }

    return runAdminAction('addCandidate', (ballot) => ballot.addCandidate(name), `Added candidate "${name}".`)
  }

  async function approveVoter(rawAddress) {
    const address = rawAddress.trim()
    if (!isAddress(address)) {
      setAdminNotice(null)
      setAdminError('Enter a valid wallet address (0x followed by 40 hexadecimal characters), copied exactly.')
      return false
    }

    return runAdminAction('approveVoter', (ballot) => ballot.approveVoter(address), `Approved voter ${address}.`)
  }

  function startVoting() {
    return runAdminAction('startVoting', (ballot) => ballot.startVoting(), 'Voting is now open.')
  }

  function endVoting() {
    return runAdminAction('endVoting', (ballot) => ballot.endVoting(), 'Voting has been closed.')
  }

  return {
    candidates,
    candidatesError,
    votingFor,
    voteError,
    lastVotedId,
    adminAddress,
    electionState,
    candidateCount,
    adminAction,
    adminError,
    adminNotice,
    stateLabel,
    loadCandidates,
    loadElectionInfo,
    castVote,
    clearVoteTick,
    addCandidate,
    approveVoter,
    startVoting,
    endVoting,
  }
}
