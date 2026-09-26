import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Contract, isAddress } from 'ethers'
import { BALLOT_ABI } from '../contract'
import { ELECTION_STATES } from '../lib/constants'
import { describeAdminError, describeVoteError } from '../lib/errors'
import { isOnSepolia } from './useWallet'

export function useBallot(provider, electionAddress, loadActivity, onElectionChanged) {
  const { t } = useTranslation()
  const tRef = useRef(t)

  useEffect(() => {
    tRef.current = t
  }, [t])

  const [candidates, setCandidates] = useState(null)
  const [candidatesError, setCandidatesError] = useState(null)
  const [votingFor, setVotingFor] = useState(null)
  const [voteError, setVoteError] = useState(null)
  const [lastVotedId, setLastVotedId] = useState(null)

  const [adminAddress, setAdminAddress] = useState(null)
  const [electionState, setElectionState] = useState(null)
  const [candidateCount, setCandidateCount] = useState(null)
  const [approvedVoterCount, setApprovedVoterCount] = useState(null)
  const [totalVotes, setTotalVotes] = useState(null)
  const [adminAction, setAdminAction] = useState(null)
  const [adminError, setAdminError] = useState(null)
  const [adminNotice, setAdminNotice] = useState(null)

  const stateLabel = ELECTION_STATES[electionState]

  const loadCandidates = useCallback(async (provider) => {
    setCandidatesError(null)
    try {
      if (!(await isOnSepolia(provider))) {
        setCandidatesError(tRef.current('errors.wrongNetwork'))
        return
      }

      const ballot = new Contract(electionAddress, BALLOT_ABI, provider)
      const results = await ballot.getResults()

      setCandidates(results.map((c) => ({ name: c.name, voteCount: c.voteCount.toString() })))
    } catch (err) {
      setCandidatesError(
        tRef.current('candidates.loadFailed', { reason: err.shortMessage ?? err.message })
      )
    }
  }, [electionAddress])

  const loadElectionInfo = useCallback(async (provider) => {
    try {
      if (!(await isOnSepolia(provider))) {
        return
      }

      const ballot = new Contract(electionAddress, BALLOT_ABI, provider)
      const [admin, state, count, approved, votes] = await Promise.all([
        ballot.admin(),
        ballot.state(),
        ballot.candidateCount(),
        ballot.approvedVoterCount(),
        ballot.totalVotes(),
      ])

      setAdminAddress(admin)
      setElectionState(Number(state))
      setCandidateCount(Number(count))
      setApprovedVoterCount(Number(approved))
      setTotalVotes(Number(votes))
    } catch (err) {
      setAdminError(tRef.current('admin.loadFailed', { reason: err.shortMessage ?? err.message }))
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
      const electionInfoLoaded = loadElectionInfo(provider)
      await loadCandidates(provider)
      setLastVotedId(candidateId)
      await Promise.all([activityLoaded, electionInfoLoaded])

      onElectionChanged?.()
    } catch (err) {
      setVoteError(describeVoteError(err, t))
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

      onElectionChanged?.()
      return true
    } catch (err) {
      setAdminError(describeAdminError(err, t))
      return false
    } finally {
      setAdminAction(null)
    }
  }

  async function addCandidate(rawName) {
    const name = rawName.trim()
    if (!name) {
      setAdminNotice(null)
      setAdminError(t('admin.enterName'))
      return false
    }

    return runAdminAction(
      'addCandidate',
      (ballot) => ballot.addCandidate(name),
      t('admin.candidateAdded', { name })
    )
  }

  async function approveVoter(rawAddress) {
    const address = rawAddress.trim()
    if (!isAddress(address)) {
      setAdminNotice(null)
      setAdminError(t('admin.enterAddress'))
      return false
    }

    return runAdminAction(
      'approveVoter',
      (ballot) => ballot.approveVoter(address),
      t('admin.voterApproved', { address })
    )
  }

  function startVoting() {
    return runAdminAction('startVoting', (ballot) => ballot.startVoting(), t('admin.votingOpened'))
  }

  function endVoting() {
    return runAdminAction('endVoting', (ballot) => ballot.endVoting(), t('admin.votingClosed'))
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
    approvedVoterCount,
    totalVotes,
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
